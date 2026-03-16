const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { TelegramClient, Api } = require("telegram");
const { computeCheck } = require("telegram/Password");
const { StringSession } = require("telegram/sessions");
const User = require("../models/User");
const ClientManager = require("../ClientManager");
const { encrypt } = require("../utils/encryption");
const input = require("input"); // check if needed

const { protect } = require("../middleware/authMiddleware");

// In-memory store for pending sessions (phoneCodeHash -> sessionString)
// In production, this should be Redis or similar
const pendingSessions = new Map();

router.get("/me", protect, async (req, res) => {
  try {
    const client = await ClientManager.getClient(req.userId);
    if (!client) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    const me = await client.getMe();
    const user = await User.findById(req.userId);
    res.json({
      user: {
        id: me.id.toString(),
        firstName: me.firstName,
        username: me.username,
        phone: me.phone,
        starredDrives: user ? user.starredDrives : [],
      },
    });
  } catch (error) {
    console.error("Check auth error:", error);
    res.status(401).json({ error: "Invalid session" });
  }
});

router.post("/send-code", async (req, res) => {
  const { phone } = req.body;
  try {
    const client = new TelegramClient(
      new StringSession(""),
      parseInt(process.env.TELEGRAM_API_ID),
      process.env.TELEGRAM_API_HASH,
      { connectionRetries: 5 },
    );
    client.setLogLevel("none");
    await client.connect();

    const { phoneCodeHash } = await client.sendCode(
      {
        apiId: parseInt(process.env.TELEGRAM_API_ID),
        apiHash: process.env.TELEGRAM_API_HASH,
      },
      phone,
    );
    const session = client.session.save();
    await client.disconnect();

    // Store session securely on server
    pendingSessions.set(phoneCodeHash, {
      session,
      phone,
      timestamp: Date.now(),
    });

    // Cleanup old sessions periodically (optional but good practice)
    // For now, simple approach: delete after 5 mins
    setTimeout(
      () => {
        if (pendingSessions.has(phoneCodeHash)) {
          pendingSessions.delete(phoneCodeHash);
        }
      },
      5 * 60 * 1000,
    );

    res.json({ phoneCodeHash });
  } catch (error) {
    console.error("Send code error:", error);
    res.status(500).json({ message: error.message || "Failed to send code" });
  }
});

router.post("/sign-in", async (req, res) => {
  const { phone, code, phoneCodeHash, password } = req.body;
  try {
    // Check if phoneCodeHash exists and is valid
    const sessionData = pendingSessions.get(phoneCodeHash);
    if (!sessionData) {
      return res.status(400).json({
        message: "Session expired or not found. Please request code again.",
      });
    }

    // Validate that the phone matches
    if (sessionData.phone !== phone) {
      return res.status(400).json({
        message: "Phone number mismatch. Please request code again.",
      });
    }

    // Use the stored session from send-code
    const client = new TelegramClient(
      new StringSession(sessionData.session || ""),
      parseInt(process.env.TELEGRAM_API_ID),
      process.env.TELEGRAM_API_HASH,
      { connectionRetries: 5 },
    );
    client.setLogLevel("none");
    await client.connect();

    if (!phoneCodeHash) {
      return res.status(400).json({ message: "phoneCodeHash is required" });
    }

    let result;
    try {
      result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          phoneCode: String(code),
        }),
      );
    } catch (e) {
      console.log("Sign in error:", e.errorMessage, "for phone:", phone);
      if (e.errorMessage === "SESSION_PASSWORD_NEEDED") {
        console.log("2FA required for phone:", phone);
        // 2FA enabled
        const passwordSrpResult = await client.invoke(
          new Api.account.GetPassword(),
        );
        console.log("Password SRP result:", passwordSrpResult);
        console.log("Password provided:", password ? "yes" : "no");
        const passwordSrpCheck = await computeCheck(
          passwordSrpResult,
          password,
        );
        console.log("Password SRP check computed");
        result = await client.invoke(
          new Api.auth.CheckPassword({
            password: passwordSrpCheck,
          }),
        );
        console.log("CheckPassword result:", result);
      } else if (e.errorMessage === "PHONE_CODE_INVALID") {
        return res.status(400).json({ message: "Invalid code" });
      } else if (e.errorMessage === "PHONE_CODE_EXPIRED") {
        // Remove the expired session
        pendingSessions.delete(phoneCodeHash);
        return res
          .status(400)
          .json({ message: "Code expired. Please request a new code." });
      } else {
        throw e;
      }
    }

    if (result instanceof Api.auth.AuthorizationSignUpRequired) {
      // Sign up if needed (simplified, assuming user provides name or use defaults)
      // In a real app, we might want to ask for name here
      result = await client.invoke(
        new Api.auth.SignUp({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          firstName: "New User", // Placeholder or get from request
          lastName: "",
        }),
      );
    }

    // At this point, result should contain the User object (inside authorization or user)
    // Check for User object structure in result
    let userObj;
    if (result instanceof Api.auth.Authorization) {
      userObj = result.user;
    } else if (result.user) {
      userObj = result.user; // Some returns have user directly
    } else {
      // fallback or error
      userObj = result; // might be user object itself if direct return
    }

    // The original code expected `await client.signInUser` to return the user.
    // Now we have the user object `userObj`, but `client.start` flow might set some internal state?
    // Actually, since we essentially did what signInUser does, we just need to ensure
    // We are 'connected' and 'authorized'.
    // `client.session.save()` will grab the auth key which is now set.

    // ... (inside sign-in route)

    const sessionString = client.session.save();
    const me = await client.getMe();
    const userId = me.id.toString();

    // Encrypt session string
    const encryptedSession = encrypt(sessionString);

    // Save/Update User in DB
    let user = await User.findOne({ phone });
    if (user) {
      user.sessionString = encryptedSession;
      user.firstName = me.firstName;
      user.username = me.username;
      await user.save();
    } else {
      user = await User.create({
        phone,
        sessionString: encryptedSession,
        firstName: me.firstName,
        username: me.username,
      });
    }

    // Add to ClientManager
    ClientManager.addClient(user._id.toString(), client);

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      user: {
        id: userId,
        firstName: me.firstName,
        username: me.username,
        phone: me.phone,
        starredDrives: user.starredDrives || [],
      },
      token,
    });
  } catch (error) {
    console.error("Sign in error:", error);
    if (error.message && error.message.includes("PASSWORD_NEEDED")) {
      return res.status(401).json({
        error: "SESSION_PASSWORD_NEEDED",
        message: "2FA Password needed",
      });
    }
    res.status(500).json({ message: error.message || "Failed to sign in" });
  }
});

router.post("/star-drive", protect, async (req, res) => {
  const { driveId } = req.body;
  if (!driveId) return res.status(400).json({ error: "Missing driveId" });

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const index = user.starredDrives.indexOf(driveId);
    if (index > -1) {
      user.starredDrives.splice(index, 1);
    } else {
      user.starredDrives.push(driveId);
    }
    await user.save();

    res.json({ starredDrives: user.starredDrives });
  } catch (error) {
    console.error("Star drive error:", error);
    res.status(500).json({ error: "Failed to star drive" });
  }
});

router.post("/logout", protect, async (req, res) => {
  try {
    // Remove the client from ClientManager
    ClientManager.removeClient(req.userId);

    // Clear the HTTP-only cookie with same options as set
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
});

module.exports = router;

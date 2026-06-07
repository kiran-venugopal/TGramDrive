# TGramDrive TV — Android TV Application

This is a native Android TV web-wrapper client for TGramDrive, designed to run smoothly on Smart TVs and streaming boxes (Android TV/Google TV).

## Key Features
* **Leanback TV Launcher Support**: Compliant with Android TV standards. Displays a premium banner on the TV home screen launcher and is fully navigable using a remote control.
* **On-Screen Configuration**: Shows a configuration setup overlay upon first launch. This lets you input your self-hosted TGramDrive server URL (e.g., your Google Cloud Run instance or local network IP) using the TV keyboard or remote control. It stores the URL securely using `SharedPreferences`.
* **2D D-pad Spatial Navigation**: Automatically injects a custom spatial navigation script into the web client, allowing you to navigate the React dashboard, folders, and modal dialogs using only the remote control's **Arrow keys** and **Select (Enter)** button.
* **Remote Back Button Support**: Maps the remote's **Back** button to navigate backward in the folder/navigation history of your drive. Pressing Back at the root view will prompt a toggle back to the settings screen or exit the app.

---

## Getting Started

### 1. Open in Android Studio
1. Open **Android Studio**.
2. Select **Open** and select the `android-tv` directory.
3. Android Studio will automatically read the Gradle configuration, download the required Gradle 8.5 distribution, and generate the wrapper execution scripts (`gradlew`, `gradle-wrapper.jar`).

### 2. Build the APK
You can compile the debug APK directly from Android Studio or by using the terminal:

**On macOS/Linux:**
```bash
./gradlew assembleDebug
```

**On Windows:**
```cmd
gradlew.bat assembleDebug
```

The compiled APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

---

## Installation on Android TV

You can deploy the APK to your physical Android TV or Android TV emulator using the Android Debug Bridge (ADB):

1. **Enable Developer Options & ADB Debugging on your TV**:
   * Go to **Settings** > **Device Preferences** > **About** on your TV.
   * Scroll down to **Build** and click it 7 times until it says you are a developer.
   * Go back and select **Developer Options**.
   * Enable **USB Debugging** (or **Network Debugging**).

2. **Connect to your TV**:
   Find your TV's IP address (under Settings > Network & Internet) and run:
   ```bash
   adb connect <TV-IP-ADDRESS>
   ```

3. **Install the APK**:
   Run the following command in the `android-tv` folder:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Technical Details

### D-pad Navigation (Spatial Navigation Helper)
Smart TV remotes send keyboard events (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`) to the browser WebView. 

To prevent you from having to modify the entire web front-end codebase, the app injects `assets/spatial_navigation.js` once the WebView finishes loading. This script:
1. Dynamically detects all clickable elements on the page (links, buttons, inputs, dropdown items, file cards, and elements with the `cursor-pointer` class).
2. Calculates the 2D bounding boxes of all elements.
3. Computes the closest element in the direction of the pressed arrow key.
4. Moves the browser focus to that element and scrolls it into view.
5. Emulates a mouse click when the remote's **Center (Enter/OK)** button is pressed.

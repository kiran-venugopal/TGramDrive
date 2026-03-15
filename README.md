# TGramDrive

A modern, secure file storage application that leverages Telegram's infrastructure for storing and managing files. Built with React (frontend) and Express.js (backend), featuring JWT authentication and a Progressive Web App (PWA) interface.

## Features

- **Secure File Storage**: Files are stored directly on Telegram's servers, ensuring high availability and security.
- **User Authentication**: JWT-based authentication with Telegram session management.
- **File Management**: Upload, download, and organize files in folders.
- **Cross-Platform**: Works on desktop and mobile via PWA.
- **Real-time Sync**: Offline support with IndexedDB for local caching.
- **Responsive UI**: Built with Tailwind CSS and Framer Motion for smooth animations.

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Framer Motion** for animations
- **IndexedDB** (via idb-keyval) for offline storage
- **PWA** with Service Worker

### Backend

- **Express.js** with Node.js
- **Telegram API** (gram.js) for file operations
- **MongoDB** with Mongoose for metadata storage
- **JWT** for authentication
- **Multer** for file uploads
- **CORS** and security middleware

## Prerequisites

- Node.js >= 18.0.0
- MongoDB database (local or cloud, e.g., MongoDB Atlas)
- Telegram API credentials (get from [my.telegram.org](https://my.telegram.org))

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/kiran-venugopal/TGramDrive.git
   cd TGramDrive
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see below).

## Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```env
PORT=3000
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
MONGODB_URI=mongodb://localhost:27017/tgramdrive
JWT_SECRET=your_jwt_secret_key
SESSION_ENCRYPTION_KEY=your_session_encryption_key
```

### Getting Telegram API Credentials

1. Go to [my.telegram.org](https://my.telegram.org) and log in.
2. Create a new application.
3. Copy the `api_id` and `api_hash` to your `.env` file.

### Notes

- `MONGODB_URI`: Use your MongoDB connection string.
- `JWT_SECRET`: A strong, random string for signing JWT tokens.
- `SESSION_ENCRYPTION_KEY`: A 32-character key for encrypting Telegram sessions.

## Running in Development Mode

### Frontend Only

```bash
cd client
npm run dev
```

Opens at `http://localhost:5173`

### Backend Only

```bash
cd server
npm run dev
```

Runs on `http://localhost:3000` with nodemon for auto-restart.

### Full Stack (Recommended)

1. Start the backend:

   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend:

   ```bash
   cd client
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

The frontend will proxy API requests to the backend.

## Building for Production

1. Build the entire project:

   ```bash
   npm run build
   ```

   This installs client dependencies, builds the frontend to `client/dist`, and installs server dependencies.

2. Start the production server:
   ```bash
   npm start
   ```
   Runs on `http://localhost:3000`.

## How the Backend Works

The backend is an Express.js server that acts as a bridge between the frontend and Telegram's API:

### Key Components

- **Authentication Routes** (`/api/auth`): Handle user login/logout using Telegram sessions.
- **File Routes** (`/api/files`): Manage file operations (upload, download, list) via Telegram API.
- **Folder Routes** (`/api/folders`): Organize files into folders using MongoDB metadata.
- **Client Manager**: Maintains Telegram client instances per user session.
- **Database Models**: Store user info, file/folder mappings in MongoDB.

### File Storage Flow

1. User uploads a file via frontend.
2. Backend receives the file and uploads it to Telegram using the user's session.
3. File metadata (Telegram message ID, size, etc.) is stored in MongoDB.
4. Downloads retrieve the file from Telegram and stream it to the user.

### Security

- All routes are protected with JWT middleware.
- Telegram sessions are encrypted and stored securely.
- CORS is configured to allow the frontend origin.

## How Authentication Works

1. **Login Process**:
   - User enters phone number on frontend.
   - Backend sends verification code via Telegram API.
   - User enters code; backend creates a Telegram session.
   - JWT token is issued and stored in HTTP-only cookies.

2. **Session Management**:
   - Telegram sessions are encrypted and stored in the database.
   - JWT tokens expire and require re-authentication.

3. **Logout**:
   - Destroys the Telegram session and clears the JWT token.

## API Endpoints

### Authentication

- `POST /api/auth/send-code` - Send verification code
- `POST /api/auth/verify-code` - Verify code and login
- `POST /api/auth/logout` - Logout user

### Files

- `GET /api/files/drives` - List user's Telegram chats/drives
- `GET /api/files/:driveId` - List files in a drive
- `POST /api/files/upload` - Upload a file
- `GET /api/files/download/:fileId` - Download a file

### Folders

- `GET /api/folders` - List user's folders
- `POST /api/folders` - Create a folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly.
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature-name`
6. Open a Pull Request.

## License

ISC License - see LICENSE file for details.

## Support

If you encounter issues:

- Check the Vercel function logs for backend errors.
- Ensure all environment variables are set correctly.
- Verify Telegram API credentials are valid.

For questions, open an issue on GitHub.

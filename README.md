# GitTalk

Real-time DMs and PR/Issue side-chat **inside GitHub*, enabling seamless communication directly to GitHub users and on PR/Issue discussions.

## Features

- **🔐 GitHub OAuth Authentication** - Secure login with GitHub accounts
- **💬 Direct Messages** - Chat with any GitHub user from their profile page
- **🧵 Thread Chats** - Discuss PRs and Issues in dedicated chat rooms
- **⚡ Real-time Messaging** - Instant message delivery via Socket.IO
- **🔧 Chrome Extension** - Seamless integration with GitHub UI
- **🏗️ Modern Tech Stack** - NestJS, Prisma, PostgreSQL, Vue 3, TypeScript
```

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 8+
- Docker and Docker Compose
- Chrome browser

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/gittalk.git
cd gittalk
pnpm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
cp .env server/.env
```

### 3. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: GitTalk
   - **Homepage URL**: `http://localhost:4000`
   - **Authorization callback URL**: `http://localhost:4000/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env` file

### 4. Start the Application

```bash
# Start database
docker compose up -d

# Setup database
cd server
pnpm db:generate
pnpm db:migrate
cd ..

# Build extension
cd extension
pnpm build
cd ..

# Start server
cd server
pnpm dev
```

### 5. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## Usage

### Direct Messages

1. Visit any GitHub profile page
2. Click "Message @username" button
3. Login with GitHub if needed
4. Start chatting!

### Thread Chats

1. Go to any GitHub PR or Issue page
2. Click "Open Chat" button
3. Join the discussion with other users

## 🔧 Development

### Server Development

```bash
cd server
pnpm dev          # Start development server
pnpm db:studio    # Open Prisma Studio
pnpm test         # Run tests
```

### Extension Development

```bash
cd extension
pnpm build        # Build extension
pnpm dev          # Development with HMR
```

## API Documentation

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/me` - Get current user profile

### Rooms
- `POST /rooms/dm/:login` - Create/get DM room with user
- `POST /rooms/thread` - Create/get thread room for URL
- `GET /rooms` - List user's rooms
- `GET /rooms/:id` - Get room details

### Messages
- `GET /rooms/:id/messages` - Get room messages
- `POST /rooms/:id/messages` - Send message to room

### Socket.IO Events
- `joinRoom` - Join a chat room
- `leaveRoom` - Leave a chat room
- `sendMessage` - Send a message
- `messageCreated` - Receive new message

## 🗄️ Data Model

```prisma
User {
  id        String   @id @default(cuid())
  githubId  String   @unique
  login     String   @unique
  avatarUrl String?
  createdAt DateTime @default(now())
}

Room {
  id         String   @id @default(cuid())
  type       RoomType // DM | THREAD
  contextUrl String?
  createdAt  DateTime @default(now())
}

RoomParticipant {
  id     String @id @default(cuid())
  roomId String
  userId String
}

Message {
  id       String   @id @default(cuid())
  roomId   String
  senderId String
  body     String
  createdAt DateTime @default(now())
}
```

## Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure extension is built: `cd extension && pnpm build`
- Check Chrome extension console for errors
- Verify manifest.json is valid

**OAuth not working:**
- Verify GitHub OAuth app callback URL is correct
- Check GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env
- Ensure server is running on port 4000

**Database connection:**
- Check PostgreSQL is running: `docker compose ps`
- Verify DATABASE_URL in .env
- Run migrations: `cd server && pnpm db:migrate`

**Socket.IO connection:**
- Verify server is running and accessible
- Check CORS settings in server
- Ensure token is valid

## Production Deployment

### Server Deployment

1. Set production environment variables
2. Use production PostgreSQL instance
3. Build: `pnpm --filter server build`
4. Start: `pnpm --filter server start:prod`

### Extension Deployment

1. Build: `pnpm --filter extension build`
2. Package the `extension/dist` folder
3. Submit to Chrome Web Store

## Contribution

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the FSL-1.1-MIT License. See the LICENSE file for details.

## Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
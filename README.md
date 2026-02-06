# Super Bowl Squares

A mobile-optimized web app for playing Super Bowl squares with friends.

## Features

- **Admin**: Create games with custom price per square and payout schedule (Q1, Halftime, Q3, Final)
- **Invite Link**: Share a unique link for players to join
- **Players**: Enter name, select quantity of squares to buy, then pick specific squares from the grid
- **Real-time**: Live updates when players select squares (Socket.io)
- **Start Game**: Admin assigns random 0-9 numbers to rows/columns and locks the grid

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Start development server with Socket.io
- `npm run build` - Build for production
- `npm start` - Start production server

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)
- Socket.io

## Database

The SQLite database is stored in `/data/squares.db` and is created automatically on first run.

## Deployment (Railway)

To host so players can access from their phones:

1. **Create a GitHub repo** at github.com (e.g. `super-bowl-squares`)

2. **Push your code** (if not already done):
   ```bash
   git remote add origin https://github.com/kevboehm/super-bowl-squares.git
   git push -u origin main
   ```

3. **Deploy to Railway:**
   - Sign up at [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo → select `kevboehm/super-bowl-squares`
   - Railway auto-detects the config from `railway.json`
   - Add a **Volume** (Settings → Volumes) and mount at `/data` for SQLite persistence
   - Add env var **`DATA_DIR`** = `/data` (Settings → Variables) so the app uses the volume
   - Generate a domain (Settings → Networking → Generate Domain)
   - Deploy triggers automatically on each push to main

4. **Share the URL** (e.g. `https://super-bowl-squares-production.up.railway.app`) with players.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a streaming audio website prototype that delivers 24-bit lossless audio to users. The application fetches live streaming metadata from CloudFront and displays current/previous tracks with a rating system.

**Stack:**
- Backend: Node.js + Express.js (ES modules)
- Database: SQLite with Prisma ORM
- Frontend: Vanilla JavaScript (no framework)
- Streaming: HLS (m3u8) live stream from CloudFront

## Development Commands

**Start development server** (with auto-reload):
```bash
npm run dev
```
This uses nodemon to automatically reload when server files or Prisma schema change. The server also includes livereload for client-side file changes in the `public/` directory.

**Start production server**:
```bash
npm start
```

**Database operations**:
```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name migration_name

# Seed the database with sample data
node seed.js

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

## Architecture

### Server Architecture (server.js)

The Express server is organized into functional sections:

1. **LiveReload Setup** (lines 18-32): In development mode, watches `public/` directory and auto-refreshes browser on changes
2. **API Routes by Resource**: Shows, Hosts, Playlists, Songs endpoints (CRUD operations)
3. **Metadata Integration** (lines 234-397):
   - `/api/metadata` - Proxies CloudFront metadata (current + 5 previous tracks)
   - `/api/metadata/save` - Persists streaming metadata to database, auto-creates "Live Stream" host/show/playlist
4. **Ratings System** (lines 399-510): Thumbs up/down voting with unique constraint on `(songArtist, songTitle, clientId)`

### Client Architecture (public/app.js)

Single-page application with these key subsystems:

1. **Audio Streaming** (lines 3-23): HLS live stream playback
2. **Metadata Polling** (lines 434-449): Fetches CloudFront metadata every 10 seconds
3. **Song Navigation** (lines 13-16, 338-410): Users can browse current + recent tracks while stream continues
4. **Rating System** (lines 18-61, 264-308): Client-side rating state synced with localStorage and server
5. **Dynamic UI Updates** (lines 97-262): Real-time display updates preserving user selections during metadata refresh

**Key Behavioral Note**: When metadata updates arrive (every 10s), the UI attempts to preserve the user's manually selected song. If that song is no longer in the recent list, it defaults back to the current track.

### Database Schema (prisma/schema.prisma)

Core models:
- **Show** → **Host**: Many-to-one relationship
- **Playlist** → **Show**: Many-to-one relationship
- **Song** → **Playlist**: Many-to-one relationship
- **Rating**: Independent model with unique constraint on `(songArtist, songTitle, clientId)` to prevent duplicate ratings

The Rating model is denormalized (doesn't reference Song table directly) to handle live stream metadata that may not be in the database yet.

## Important Implementation Details

**Environment Configuration**:
- Database URL must be in `.env.local` (not `.env`)
- Example: `DATABASE_URL="file:./prisma/dev.db"`
- Server loads dotenv with: `dotenv.config({path: '.env.local'})`

**ES Modules**:
- `package.json` sets `"type": "module"`
- Use `import/export` syntax, not `require()`

**Nodemon Configuration** (nodemon.json):
- Watches: `server.js`, Prisma schema, `.env` files
- Ignores: `node_modules/`, `public/`, `prisma/migrations/`
- Delay: 1 second before restart

**Client-side Data Persistence**:
- `clientId`: Unique user identifier stored in localStorage
- Rated songs: Cached in localStorage to show rated state immediately without server round-trip

**Audio Streaming Source**:
- Live HLS stream: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`
- Metadata endpoint: `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json`

## Prisma Workflow

When modifying the database schema:

1. Edit `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name descriptive_name`
3. Prisma client is auto-generated during migration
4. Server auto-reloads (via nodemon watching schema.prisma)

For production deployment:
```bash
npx prisma migrate deploy
```

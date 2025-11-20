import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({path: '.env.local'});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Basic route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Example API route with Prisma (will work after schema is set up)
app.get('/api/test-db', async (req, res) => {
  try {
    // This will test the database connection
    await prisma.$connect();
    res.json({
      status: 'Database connected successfully',
      database: 'SQLite'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// ====== Shows API ======
// Get all shows
app.get('/api/shows', async (req, res) => {
  try {
    const shows = await prisma.show.findMany({
      include: {
        host: true,
        playlists: {
          include: {
            songs: true
          }
        }
      }
    });
    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shows', message: error.message });
  }
});

// Get single show
app.get('/api/shows/:id', async (req, res) => {
  try {
    const show = await prisma.show.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        host: true,
        playlists: {
          include: {
            songs: true
          }
        }
      }
    });
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }
    res.json(show);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch show', message: error.message });
  }
});

// Create show
app.post('/api/shows', async (req, res) => {
  try {
    const { title, description, airTime, hostId } = req.body;
    const show = await prisma.show.create({
      data: { title, description, airTime, hostId: parseInt(hostId) },
      include: { host: true }
    });
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create show', message: error.message });
  }
});

// ====== Hosts API ======
// Get all hosts
app.get('/api/hosts', async (req, res) => {
  try {
    const hosts = await prisma.host.findMany({
      include: {
        shows: true
      }
    });
    res.json(hosts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hosts', message: error.message });
  }
});

// Get single host
app.get('/api/hosts/:id', async (req, res) => {
  try {
    const host = await prisma.host.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        shows: true
      }
    });
    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }
    res.json(host);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch host', message: error.message });
  }
});

// Create host
app.post('/api/hosts', async (req, res) => {
  try {
    const { name, bio, email } = req.body;
    const host = await prisma.host.create({
      data: { name, bio, email }
    });
    res.status(201).json(host);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create host', message: error.message });
  }
});

// ====== Playlists API ======
// Get all playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        show: {
          include: {
            host: true
          }
        },
        songs: true
      }
    });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists', message: error.message });
  }
});

// Get single playlist
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        show: {
          include: {
            host: true
          }
        },
        songs: true
      }
    });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlist', message: error.message });
  }
});

// Create playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const { name, date, showId } = req.body;
    const playlist = await prisma.playlist.create({
      data: {
        name,
        date: new Date(date),
        showId: parseInt(showId)
      },
      include: { show: true }
    });
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist', message: error.message });
  }
});

// ====== Songs API ======
// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      include: {
        playlist: {
          include: {
            show: true
          }
        }
      }
    });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch songs', message: error.message });
  }
});

// Get single song
app.get('/api/songs/:id', async (req, res) => {
  try {
    const song = await prisma.song.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        playlist: {
          include: {
            show: true
          }
        }
      }
    });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch song', message: error.message });
  }
});

// Create song
app.post('/api/songs', async (req, res) => {
  try {
    const { title, artist, album, duration, playlistId } = req.body;
    const song = await prisma.song.create({
      data: {
        title,
        artist,
        album,
        duration: duration ? parseInt(duration) : null,
        playlistId: parseInt(playlistId)
      },
      include: { playlist: true }
    });
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create song', message: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Radio Calico server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

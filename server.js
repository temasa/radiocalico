import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import livereload from 'livereload';
import connectLivereload from 'connect-livereload';

// Load environment variables
dotenv.config({path: '.env.local'});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Setup livereload in development
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch('public');

  // Refresh the browser when public files change
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });

  app.use(connectLivereload());
  console.log('LiveReload enabled - watching public/ directory');
}

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

// ====== Metadata API ======
// Get now playing metadata from CloudFront
app.get('/api/metadata', async (req, res) => {
  try {
    const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
    const response = await fetch(metadataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({
      error: 'Failed to fetch metadata',
      message: error.message
    });
  }
});

// Save metadata to database as a playlist
app.post('/api/metadata/save', async (req, res) => {
  try {
    const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
    const response = await fetch(metadataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();

    // Find or create the "Live Stream" host
    let host = await prisma.host.findFirst({
      where: { email: 'livestream@radiocalico.com' }
    });

    if (!host) {
      host = await prisma.host.create({
        data: {
          name: 'Radio Calico Live',
          bio: 'Live streaming radio station',
          email: 'livestream@radiocalico.com'
        }
      });
    }

    // Find or create the "Live Stream" show
    let show = await prisma.show.findFirst({
      where: {
        title: 'Live Stream',
        hostId: host.id
      }
    });

    if (!show) {
      show = await prisma.show.create({
        data: {
          title: 'Live Stream',
          description: '24/7 Live streaming audio',
          airTime: '24/7',
          hostId: host.id
        }
      });
    }

    // Find or create today's "Now Playing" playlist
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const playlistName = `Now Playing - ${new Date().toLocaleDateString()}`;

    let playlist = await prisma.playlist.findFirst({
      where: {
        showId: show.id,
        date: {
          gte: today
        }
      },
      include: {
        songs: true
      }
    });

    if (!playlist) {
      playlist = await prisma.playlist.create({
        data: {
          name: playlistName,
          date: new Date(),
          showId: show.id
        },
        include: {
          songs: true
        }
      });
    }

    // Build list of all songs from metadata (current + previous)
    const songs = [
      {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || null
      }
    ];

    // Add previous songs
    for (let i = 1; i <= 5; i++) {
      const artistKey = `prev_artist_${i}`;
      const titleKey = `prev_title_${i}`;

      if (metadata[artistKey] && metadata[titleKey]) {
        songs.push({
          title: metadata[titleKey],
          artist: metadata[artistKey],
          album: null
        });
      }
    }

    // Delete existing songs from the playlist
    await prisma.song.deleteMany({
      where: { playlistId: playlist.id }
    });

    // Add new songs to the playlist
    for (const song of songs) {
      await prisma.song.create({
        data: {
          title: song.title,
          artist: song.artist,
          album: song.album,
          playlistId: playlist.id
        }
      });
    }

    // Fetch the updated playlist with songs
    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: playlist.id },
      include: {
        songs: true,
        show: {
          include: {
            host: true
          }
        }
      }
    });

    res.json({
      success: true,
      playlist: updatedPlaylist
    });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).json({
      error: 'Failed to save metadata',
      message: error.message
    });
  }
});

// ====== Ratings API ======
// Submit a rating for a song
app.post('/api/ratings', async (req, res) => {
  try {
    const { songArtist, songTitle, ratingType, clientId } = req.body;

    // Validate input
    if (!songArtist || !songTitle || !ratingType || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (ratingType !== 'up' && ratingType !== 'down') {
      return res.status(400).json({ error: 'Invalid rating type' });
    }

    // Check if user already rated this song
    const existingRating = await prisma.rating.findUnique({
      where: {
        songArtist_songTitle_clientId: {
          songArtist,
          songTitle,
          clientId
        }
      }
    });

    if (existingRating) {
      // Update the existing rating if it's different
      if (existingRating.ratingType !== ratingType) {
        const updated = await prisma.rating.update({
          where: { id: existingRating.id },
          data: { ratingType }
        });
        return res.json({ success: true, message: 'Rating updated', rating: updated });
      }
      return res.status(400).json({ error: 'You have already rated this song' });
    }

    // Create new rating
    const rating = await prisma.rating.create({
      data: {
        songArtist,
        songTitle,
        ratingType,
        clientId
      }
    });

    res.status(201).json({ success: true, rating });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ error: 'Failed to create rating', message: error.message });
  }
});

// Get ratings for a song
app.get('/api/ratings/:artist/:title', async (req, res) => {
  try {
    const { artist, title } = req.params;

    const ratings = await prisma.rating.findMany({
      where: {
        songArtist: decodeURIComponent(artist),
        songTitle: decodeURIComponent(title)
      }
    });

    const upCount = ratings.filter(r => r.ratingType === 'up').length;
    const downCount = ratings.filter(r => r.ratingType === 'down').length;

    res.json({
      songArtist: decodeURIComponent(artist),
      songTitle: decodeURIComponent(title),
      thumbsUp: upCount,
      thumbsDown: downCount,
      total: ratings.length
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings', message: error.message });
  }
});

// Delete a rating (cancel rating)
app.delete('/api/ratings', async (req, res) => {
  try {
    const { songArtist, songTitle, clientId } = req.body;

    // Validate input
    if (!songArtist || !songTitle || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find and delete the rating
    const deletedRating = await prisma.rating.deleteMany({
      where: {
        songArtist,
        songTitle,
        clientId
      }
    });

    if (deletedRating.count === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({ success: true, message: 'Rating deleted' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating', message: error.message });
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

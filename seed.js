import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Hosts
  const host1 = await prisma.host.create({
    data: {
      name: 'DJ Luna',
      bio: 'Bringing you the best indie and alternative tracks from around the globe. Music enthusiast with 10+ years of radio experience.',
      email: 'luna@radiocalico.com'
    }
  });

  const host2 = await prisma.host.create({
    data: {
      name: 'Marcus "The Groove" Johnson',
      bio: 'Your guide through the world of jazz, soul, and R&B. Keeping the classics alive while discovering new talents.',
      email: 'marcus@radiocalico.com'
    }
  });

  const host3 = await prisma.host.create({
    data: {
      name: 'Elektra Wave',
      bio: 'Electronic music curator specializing in ambient, techno, and experimental sounds. Late night vibes guaranteed.',
      email: 'elektra@radiocalico.com'
    }
  });

  console.log('Created hosts:', host1.name, host2.name, host3.name);

  // Create Shows
  const show1 = await prisma.show.create({
    data: {
      title: 'Indie Horizons',
      description: 'Discover emerging indie artists and hidden gems from the alternative music scene.',
      airTime: 'Weekdays 9 AM - 12 PM',
      hostId: host1.id
    }
  });

  const show2 = await prisma.show.create({
    data: {
      title: 'Groove Sessions',
      description: 'Classic jazz, smooth soul, and contemporary R&B flowing seamlessly into your afternoon.',
      airTime: 'Weekdays 2 PM - 6 PM',
      hostId: host2.id
    }
  });

  const show3 = await prisma.show.create({
    data: {
      title: 'Midnight Frequency',
      description: 'Deep electronic explorations for the nocturnal listener. Ambient soundscapes and techno journeys.',
      airTime: 'Weeknights 10 PM - 2 AM',
      hostId: host3.id
    }
  });

  console.log('Created shows:', show1.title, show2.title, show3.title);

  // Create Playlists
  const playlist1 = await prisma.playlist.create({
    data: {
      name: 'Indie Morning Mix',
      date: new Date('2025-11-18'),
      showId: show1.id
    }
  });

  const playlist2 = await prisma.playlist.create({
    data: {
      name: 'Soulful Afternoon',
      date: new Date('2025-11-19'),
      showId: show2.id
    }
  });

  const playlist3 = await prisma.playlist.create({
    data: {
      name: 'Late Night Electronica',
      date: new Date('2025-11-20'),
      showId: show3.id
    }
  });

  console.log('Created playlists');

  // Create Songs for Playlist 1 (Indie)
  await prisma.song.createMany({
    data: [
      {
        title: 'Crystal Dreams',
        artist: 'The Morning Coast',
        album: 'Sunrise Sessions',
        duration: 245,
        playlistId: playlist1.id
      },
      {
        title: 'Fading Light',
        artist: 'Velvet Echoes',
        album: 'Reflections',
        duration: 198,
        playlistId: playlist1.id
      },
      {
        title: 'Northern Winds',
        artist: 'Arctic Mono',
        album: 'Frozen Tales',
        duration: 213,
        playlistId: playlist1.id
      },
      {
        title: 'Summer in Berlin',
        artist: 'The Indie Collective',
        album: 'European Nights',
        duration: 267,
        playlistId: playlist1.id
      }
    ]
  });

  // Create Songs for Playlist 2 (Jazz/Soul)
  await prisma.song.createMany({
    data: [
      {
        title: 'Smooth Operator',
        artist: 'Marcus Trio',
        album: 'Live at the Blue Note',
        duration: 312,
        playlistId: playlist2.id
      },
      {
        title: 'Midnight Blues',
        artist: 'Sarah Jones',
        album: 'Soul Stories',
        duration: 278,
        playlistId: playlist2.id
      },
      {
        title: 'Take Five',
        artist: 'Classic Jazz Ensemble',
        album: 'Timeless',
        duration: 324,
        playlistId: playlist2.id
      }
    ]
  });

  // Create Songs for Playlist 3 (Electronic)
  await prisma.song.createMany({
    data: [
      {
        title: 'Digital Horizon',
        artist: 'Synthwave Collective',
        album: 'Neon Dreams',
        duration: 402,
        playlistId: playlist3.id
      },
      {
        title: 'Deep Space',
        artist: 'Ambient Dreams',
        album: 'Cosmos',
        duration: 456,
        playlistId: playlist3.id
      },
      {
        title: 'Berlin After Dark',
        artist: 'Techno Pioneers',
        album: 'Underground',
        duration: 378,
        playlistId: playlist3.id
      },
      {
        title: 'Transcendence',
        artist: 'Elektra Wave',
        album: 'Original Mix',
        duration: 511,
        playlistId: playlist3.id
      },
      {
        title: 'Orbital Station',
        artist: 'Space Cadets',
        album: 'Journey to the Stars',
        duration: 389,
        playlistId: playlist3.id
      }
    ]
  });

  console.log('Created songs for all playlists');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

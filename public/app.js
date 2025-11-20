// Radio Calico - Client-side JavaScript

// Audio Playlist - Add your audio files to /assets/audio/ folder
// Supports both local files (starting with /) and remote URLs (starting with http/https)
const audioPlaylist = [
    '/assets/audio/track1.mp3',
    '/assets/audio/track2.mp3',
    '/assets/audio/track3.mp3',
    'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8', // Live HLS stream
    // Add more tracks as needed
];

// Audio Player Setup
let isPlaying = false;
let currentTrackIndex = 0;
const audioElement = document.getElementById('radio-stream');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const trackInfoElement = document.getElementById('track-info');

// Initialize audio
audioElement.volume = 0.7;

// Helper function to detect if a URL is remote
function isRemoteUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}

// Helper function to detect if a URL is a live stream
function isLiveStream(url) {
    return url.includes('.m3u8') || url.includes('.mpd');
}

// Helper function to get track name from URL
function getTrackName(url) {
    if (isRemoteUrl(url)) {
        if (isLiveStream(url)) {
            return 'Live Stream';
        }
        return url.split('/').pop() || 'Remote Track';
    }
    return url.split('/').pop() || 'Local Track';
}

// Update track info display
function updateTrackInfo(track, index) {
    const trackName = getTrackName(track);
    const trackType = isRemoteUrl(track) ? 'Remote' : 'Local';
    const isStream = isLiveStream(track);

    trackInfoElement.innerHTML = `
        <span class="track-name">${trackName}</span>
        <span class="track-type">${trackType}${isStream ? ' Stream' : ''} • ${index + 1}/${audioPlaylist.length}</span>
    `;
}

// Initialize audio player
function initializeAudio() {
    if (audioPlaylist.length > 0) {
        loadTrack(currentTrackIndex);

        // Auto-advance to next track when current one ends (except for live streams)
        audioElement.addEventListener('ended', () => {
            const currentTrack = audioPlaylist[currentTrackIndex];
            if (!isLiveStream(currentTrack)) {
                console.log('Track ended, playing next...');
                playNextTrack();
            }
        });

        // Handle errors
        audioElement.addEventListener('error', (e) => {
            const currentTrack = audioPlaylist[currentTrackIndex];
            const trackType = isRemoteUrl(currentTrack) ? 'remote' : 'local';
            console.error(`Error loading ${trackType} track: ${currentTrack}`, e);

            // Try next track if there are more
            if (audioPlaylist.length > 1) {
                console.log('Trying next track...');
                playNextTrack();
            } else {
                alert(`Unable to play ${trackType} audio file. Please check the file or your connection.`);
            }
        });
    } else {
        console.error('No tracks in playlist');
    }
}

// Load a track by index
function loadTrack(index) {
    if (index >= 0 && index < audioPlaylist.length) {
        currentTrackIndex = index;
        const track = audioPlaylist[currentTrackIndex];
        const trackType = isRemoteUrl(track) ? 'remote' : 'local';
        const trackName = getTrackName(track);

        console.log(`Loading ${trackType} track ${currentTrackIndex + 1}/${audioPlaylist.length}: ${trackName}`);
        audioElement.src = track;

        // Update track info display
        updateTrackInfo(track, currentTrackIndex);

        // Update button text to show track info
        if (!isPlaying) {
            playBtn.innerHTML = `<span class="play-icon">▶</span> Play Track ${currentTrackIndex + 1}`;
        }
    }
}

// Play next track in playlist
function playNextTrack() {
    const nextIndex = (currentTrackIndex + 1) % audioPlaylist.length;
    loadTrack(nextIndex);

    if (isPlaying) {
        audioElement.play().catch(err => {
            console.error('Error playing next track:', err);
        });
    }
}

// Play previous track in playlist
function playPreviousTrack() {
    const prevIndex = currentTrackIndex - 1 < 0 ? audioPlaylist.length - 1 : currentTrackIndex - 1;
    loadTrack(prevIndex);

    if (isPlaying) {
        audioElement.play().catch(err => {
            console.error('Error playing previous track:', err);
        });
    }
}

// Play/Pause functionality
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        audioElement.pause();
        playBtn.innerHTML = `<span class="play-icon">▶</span> Play Track ${currentTrackIndex + 1}`;
        isPlaying = false;
    } else {
        const track = audioPlaylist[currentTrackIndex];
        const trackType = isRemoteUrl(track) ? 'remote' : 'local';

        audioElement.play().catch(err => {
            console.error(`Error playing ${trackType} audio:`, err);
            alert(`Unable to play ${trackType} audio. Please check the file or your connection.`);
        });
        playBtn.innerHTML = '<span class="play-icon">⏸</span> Pause';
        isPlaying = true;
    }
});

// Volume control
volumeSlider.addEventListener('input', (e) => {
    audioElement.volume = e.target.value / 100;
});

// Next/Previous button controls
nextBtn.addEventListener('click', () => {
    playNextTrack();
});

prevBtn.addEventListener('click', () => {
    playPreviousTrack();
});

// Keyboard shortcuts for track navigation
document.addEventListener('keydown', (e) => {
    // Only if not typing in an input field
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            playNextTrack();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            playPreviousTrack();
        } else if (e.key === ' ') {
            e.preventDefault();
            playBtn.click();
        }
    }
});

// Initialize audio on page load
initializeAudio();

// API Base URL
const API_BASE = '/api';

// Fetch and display shows
async function loadShows() {
    try {
        const response = await fetch(`${API_BASE}/shows`);
        const shows = await response.json();

        const showsGrid = document.getElementById('shows-grid');

        if (shows.length === 0) {
            showsGrid.innerHTML = '<p class="loading">No shows available yet. Check back soon!</p>';
            return;
        }

        showsGrid.innerHTML = shows.map(show => `
            <div class="card">
                <h3>${escapeHtml(show.title)}</h3>
                <div class="card-meta">Hosted by ${escapeHtml(show.host.name)}</div>
                <p class="card-description">${escapeHtml(show.description || 'No description available')}</p>
                <div class="card-tag">${escapeHtml(show.airTime)}</div>
                ${show.playlists.length > 0 ? `<div class="card-tag">${show.playlists.length} Playlist${show.playlists.length !== 1 ? 's' : ''}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading shows:', error);
        document.getElementById('shows-grid').innerHTML = '<p class="loading">Unable to load shows. Please try again later.</p>';
    }
}

// Fetch and display hosts
async function loadHosts() {
    try {
        const response = await fetch(`${API_BASE}/hosts`);
        const hosts = await response.json();

        const hostsGrid = document.getElementById('hosts-grid');

        if (hosts.length === 0) {
            hostsGrid.innerHTML = '<p class="loading">No hosts available yet. Check back soon!</p>';
            return;
        }

        hostsGrid.innerHTML = hosts.map(host => `
            <div class="card host-card">
                <h3>${escapeHtml(host.name)}</h3>
                <p class="card-bio">${escapeHtml(host.bio || 'Radio personality')}</p>
                <div class="shows-count">${host.shows.length} Show${host.shows.length !== 1 ? 's' : ''}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading hosts:', error);
        document.getElementById('hosts-grid').innerHTML = '<p class="loading">Unable to load hosts. Please try again later.</p>';
    }
}

// Fetch and display playlists
async function loadPlaylists() {
    try {
        const response = await fetch(`${API_BASE}/playlists`);
        const playlists = await response.json();

        const playlistsGrid = document.getElementById('playlists-grid');

        if (playlists.length === 0) {
            playlistsGrid.innerHTML = '<p class="loading">No playlists available yet. Check back soon!</p>';
            return;
        }

        // Sort by date, most recent first
        playlists.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Show only the most recent 6 playlists
        const recentPlaylists = playlists.slice(0, 6);

        playlistsGrid.innerHTML = recentPlaylists.map(playlist => {
            const date = new Date(playlist.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const songsHtml = playlist.songs.length > 0 ? `
                <div class="songs-list">
                    <strong>Featured Songs:</strong>
                    ${playlist.songs.slice(0, 3).map(song => `
                        <div class="song-item">
                            <strong>${escapeHtml(song.artist)}</strong> - ${escapeHtml(song.title)}
                        </div>
                    `).join('')}
                    ${playlist.songs.length > 3 ? `<div class="song-item">...and ${playlist.songs.length - 3} more</div>` : ''}
                </div>
            ` : '';

            return `
                <div class="card playlist-card">
                    <h3>${escapeHtml(playlist.name)}</h3>
                    <div class="date">${date}</div>
                    <div class="card-meta">From ${escapeHtml(playlist.show.title)}</div>
                    <div class="card-tag">${playlist.songs.length} Song${playlist.songs.length !== 1 ? 's' : ''}</div>
                    ${songsHtml}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading playlists:', error);
        document.getElementById('playlists-grid').innerHTML = '<p class="loading">Unable to load playlists. Please try again later.</p>';
    }
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadShows();
    loadHosts();
    loadPlaylists();
});

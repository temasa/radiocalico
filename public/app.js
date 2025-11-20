// Radio Calico - Client-side JavaScript

// Audio Playlist - Add your audio files to /assets/audio/ folder
const audioPlaylist = [
    '/assets/audio/track1.mp3',
    '/assets/audio/track2.mp3',
    '/assets/audio/track3.mp3',
    // Add more tracks as needed
];

// Fallback stream URL if no local files are found
const STREAM_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

// Audio Player Setup
let isPlaying = false;
let currentTrackIndex = 0;
let useLocalFiles = true;
const audioElement = document.getElementById('radio-stream');
const playBtn = document.getElementById('play-btn');
const volumeSlider = document.getElementById('volume-slider');

// Initialize audio
audioElement.volume = 0.7;

// Check if local audio files exist, otherwise use stream
async function initializeAudio() {
    if (useLocalFiles && audioPlaylist.length > 0) {
        audioElement.src = audioPlaylist[currentTrackIndex];

        // Try to load the first track to check if it exists
        audioElement.addEventListener('error', function handleError() {
            console.log('Local audio file not found, switching to stream...');
            useLocalFiles = false;
            audioElement.src = STREAM_URL;
            audioElement.removeEventListener('error', handleError);
        }, { once: true });

        // Auto-advance to next track when current one ends
        audioElement.addEventListener('ended', () => {
            if (useLocalFiles) {
                playNextTrack();
            }
        });
    } else {
        audioElement.src = STREAM_URL;
    }
}

// Play next track in playlist
function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % audioPlaylist.length;
    audioElement.src = audioPlaylist[currentTrackIndex];
    if (isPlaying) {
        audioElement.play().catch(err => {
            console.error('Error playing next track:', err);
        });
    }
}

// Play/Pause functionality
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        audioElement.pause();
        playBtn.innerHTML = '<span class="play-icon">▶</span> Listen Now';
        isPlaying = false;
    } else {
        audioElement.play().catch(err => {
            console.error('Error playing audio:', err);
            if (useLocalFiles) {
                // If local files fail, try the stream
                console.log('Switching to stream...');
                useLocalFiles = false;
                audioElement.src = STREAM_URL;
                audioElement.play().catch(streamErr => {
                    console.error('Stream also failed:', streamErr);
                    alert('Unable to play audio. Please check your connection or add audio files to /assets/audio/');
                });
            } else {
                alert('Unable to play stream. Please check your connection.');
            }
        });
        playBtn.innerHTML = '<span class="play-icon">⏸</span> Pause';
        isPlaying = true;
    }
});

// Volume control
volumeSlider.addEventListener('input', (e) => {
    audioElement.volume = e.target.value / 100;
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

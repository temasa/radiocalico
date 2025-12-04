// Radio Calico - Client-side JavaScript

// Audio Playlist - Live HLS stream only
const audioPlaylist = [
    'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8', // Live HLS stream
];

// Audio Player Setup
let isPlaying = false;
let currentTrackIndex = 0;
const audioElement = document.getElementById('radio-stream');

// Song navigation state
let availableSongs = []; // Will store current + recent songs from metadata
let selectedSongIndex = 0; // Index of the song currently displayed
let userSelectedSong = false; // Track if user manually selected a song

// Rating state
let currentRatings = {}; // Store ratings for each song
let clientId = null; // Unique identifier for this user

// Initialize audio
audioElement.volume = 0.7;

// Generate or retrieve client ID
function getClientId() {
    if (!clientId) {
        clientId = localStorage.getItem('radioCalico_clientId');
        if (!clientId) {
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('radioCalico_clientId', clientId);
        }
    }
    return clientId;
}

// Get rated songs from localStorage
function getRatedSongs() {
    const rated = localStorage.getItem('radioCalico_ratedSongs');
    return rated ? JSON.parse(rated) : {};
}

// Save rated song to localStorage
function saveRatedSong(artist, title, ratingType) {
    const rated = getRatedSongs();
    rated[`${artist}::${title}`] = ratingType;
    localStorage.setItem('radioCalico_ratedSongs', JSON.stringify(rated));
}

// Remove rated song from localStorage
function removeRatedSong(artist, title) {
    const rated = getRatedSongs();
    delete rated[`${artist}::${title}`];
    localStorage.setItem('radioCalico_ratedSongs', JSON.stringify(rated));
}

// Check if song has been rated
function hasRatedSong(artist, title) {
    const rated = getRatedSongs();
    return rated[`${artist}::${title}`] || null;
}

// Metadata state
let currentMetadata = null;
let metadataInterval = null;

// Helper function to detect if a URL is a live stream
function isLiveStream(url) {
    return url.includes('.m3u8') || url.includes('.mpd');
}

// Fetch metadata directly from CloudFront
async function fetchMetadata() {
    try {
        const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
        const response = await fetch(metadataUrl);
        if (!response.ok) {
            console.error('Failed to fetch metadata:', response.statusText);
            return null;
        }
        const metadata = await response.json();
        currentMetadata = metadata;

        // Update the now playing section
        updateNowPlayingSection(metadata);

        // Save metadata to database (don't wait for it)
        saveMetadataToDatabase();

        return metadata;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}

// Update the now playing section with metadata
function updateNowPlayingSection(metadata) {
    if (!metadata) return;

    const currentTrackEl = document.getElementById('current-track');
    const previousTracksEl = document.getElementById('previous-tracks');

    if (!currentTrackEl || !previousTracksEl) return;

    const { artist, title, album, date, bit_depth, sample_rate } = metadata;
    const audioQuality = `${bit_depth}-bit / ${sample_rate / 1000}kHz`;

    // Store the previously selected song info if user manually selected one
    let previouslySelectedSong = null;
    if (userSelectedSong && availableSongs.length > 0 && selectedSongIndex < availableSongs.length) {
        previouslySelectedSong = {
            artist: availableSongs[selectedSongIndex].artist,
            title: availableSongs[selectedSongIndex].title
        };
    }

    // Build available songs array (current + recent)
    availableSongs = [
        {
            artist: artist,
            title: title,
            album: album || null,
            date: date || null,
            isCurrent: true
        }
    ];

    // Add recent tracks
    for (let i = 1; i <= 5; i++) {
        const artistKey = `prev_artist_${i}`;
        const titleKey = `prev_title_${i}`;

        if (metadata[artistKey] && metadata[titleKey]) {
            availableSongs.push({
                artist: metadata[artistKey],
                title: metadata[titleKey],
                album: null,
                date: null,
                isCurrent: false
            });
        }
    }

    // Try to maintain user's selection if they manually selected a song
    if (previouslySelectedSong) {
        const foundIndex = availableSongs.findIndex(song =>
            song.artist === previouslySelectedSong.artist &&
            song.title === previouslySelectedSong.title
        );

        if (foundIndex !== -1) {
            // Song still exists in the list, keep it selected
            selectedSongIndex = foundIndex;
            availableSongs[foundIndex].isCurrent = true;
            availableSongs[0].isCurrent = false;
        } else {
            // Song no longer in list, reset to first song
            selectedSongIndex = 0;
            userSelectedSong = false;
        }
    } else {
        // No user selection, default to first song
        selectedSongIndex = 0;
    }

    // Display the selected song
    displaySelectedSong(audioQuality);

    // Display previous tracks (skip first one as it's currently playing)
    const previousTracks = availableSongs.slice(1);
    if (previousTracks.length > 0) {
        previousTracksEl.innerHTML = previousTracks.map((track) => {
            return `
                <div class="previous-track-item">
                    <span class="previous-track-artist">${escapeHtml(track.artist)}:</span>
                    <span class="previous-track-title">${escapeHtml(track.title)}</span>
                </div>
            `;
        }).join('');
    } else {
        previousTracksEl.innerHTML = '<div class="loading">No previous tracks available</div>';
    }
}

// Display the currently selected song
async function displaySelectedSong(audioQuality) {
    const currentTrackEl = document.getElementById('current-track');
    if (!currentTrackEl || availableSongs.length === 0) return;

    const song = availableSongs[selectedSongIndex];
    if (!song) return;

    // Album art URL from CloudFront
    const albumArtUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg';

    // Extract year from date if available
    const year = song.date ? song.date : '';

    // Check if user has rated this song
    const userRating = hasRatedSong(song.artist, song.title);

    // Fetch ratings for this song
    const ratings = await fetchRatings(song.artist, song.title);
    const songKey = `${song.artist}::${song.title}`;
    currentRatings[songKey] = ratings;

    // Source and stream quality info
    const sourceQuality = currentMetadata ?
        `Source quality: ${currentMetadata.bit_depth}-bit ${(currentMetadata.sample_rate / 1000).toFixed(1)}kHz` : '';
    const streamQuality = 'Stream quality: 48kHz FLAC / HLS Lossless';

    currentTrackEl.innerHTML = `
        <div class="album-art-wrapper">
            <img src="${albumArtUrl}" alt="Album Art" class="album-art-large" onerror="this.style.display='none'">
            ${year ? `<div class="year-badge">${year}</div>` : ''}
        </div>
        <div class="song-info">
            <h1 class="song-artist">${escapeHtml(song.artist)}</h1>
            <h2 class="song-title">${escapeHtml(song.title)}${year ? ` (${year})` : ''}</h2>
            ${song.album ? `<h3 class="song-album">${escapeHtml(song.album)}</h3>` : ''}

            <div class="quality-info">
                ${sourceQuality ? `<p>${sourceQuality}</p>` : ''}
                <p>${streamQuality}</p>
            </div>

            <div class="rating-section">
                <span class="rating-label">Rate this track:</span>
                <div class="rating-buttons">
                    <button class="rating-btn thumbs-up ${userRating === 'up' ? 'rated' : ''}"
                            data-artist="${escapeHtml(song.artist)}"
                            data-title="${escapeHtml(song.title)}"
                            title="${userRating === 'up' ? 'Click to cancel' : 'Thumbs up'}">
                        👍
                    </button>
                    <button class="rating-btn thumbs-down ${userRating === 'down' ? 'rated' : ''}"
                            data-artist="${escapeHtml(song.artist)}"
                            data-title="${escapeHtml(song.title)}"
                            title="${userRating === 'down' ? 'Click to cancel' : 'Thumbs down'}">
                        👎
                    </button>
                </div>
            </div>

            <div class="player-control-bar">
                <button class="play-pause-btn" id="main-play-btn">
                    ${isPlaying ? '⏸' : '▶'}
                </button>
                <span class="time-display">0:35 / Live</span>
                <div class="volume-control-inline">
                    <span class="volume-icon">🔊</span>
                    <input type="range" class="volume-slider" id="main-volume-slider" min="0" max="100" value="70">
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    setupRatingButtons();
    setupPlayerControls();
}

// Setup event listeners for rating buttons
function setupRatingButtons() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const artist = button.getAttribute('data-artist');
            const title = button.getAttribute('data-title');
            const ratingType = button.classList.contains('thumbs-up') ? 'up' : 'down';
            const currentRating = hasRatedSong(artist, title);

            let result;

            // If user clicks the same button they already rated, cancel the rating
            if (currentRating === ratingType) {
                result = await deleteRating(artist, title);
                if (result.success) {
                    console.log('Rating cancelled');
                }
            }
            // If user clicks the opposite button, update the rating
            else if (currentRating && currentRating !== ratingType) {
                result = await submitRating(artist, title, ratingType);
                if (result.success) {
                    console.log('Rating changed from', currentRating, 'to', ratingType);
                }
            }
            // If no rating exists, submit new rating
            else {
                result = await submitRating(artist, title, ratingType);
                if (result.success) {
                    console.log('New rating submitted:', ratingType);
                }
            }

            // Refresh the display to show updated ratings
            if (result && result.success) {
                const audioQuality = currentMetadata ?
                    `${currentMetadata.bit_depth}-bit / ${currentMetadata.sample_rate / 1000}kHz` : null;
                await displaySelectedSong(audioQuality);
            } else if (result) {
                alert('Failed to update rating: ' + (result.error || 'Unknown error'));
            }
        });
    });
}

// Setup player controls
function setupPlayerControls() {
    const playBtn = document.getElementById('main-play-btn');
    const volumeSlider = document.getElementById('main-volume-slider');

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                audioElement.pause();
                isPlaying = false;
            } else {
                audioElement.play().catch(err => {
                    console.error('Error playing live stream:', err);
                });
                isPlaying = true;
            }
            // Update button icon
            playBtn.textContent = isPlaying ? '⏸' : '▶';
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audioElement.volume = e.target.value / 100;
        });
    }
}

// Select a specific song by index
function selectSong(index, shouldPlay = true) {
    if (index < 0 || index >= availableSongs.length) return;

    const previousSongIndex = selectedSongIndex;
    selectedSongIndex = index;
    userSelectedSong = true; // Mark that user manually selected a song

    // Mark the selected song as the currently playing song
    availableSongs.forEach((song, idx) => {
        song.isCurrent = (idx === selectedSongIndex);
    });

    // Get audio quality from current metadata
    const audioQuality = currentMetadata ?
        `${currentMetadata.bit_depth}-bit / ${currentMetadata.sample_rate / 1000}kHz` : null;

    // Update displays
    displaySelectedSong(audioQuality);

    // If user selected a different song, reset the stream to start from beginning
    if (previousSongIndex !== selectedSongIndex) {
        console.log(`Switching to: ${availableSongs[selectedSongIndex].artist} - ${availableSongs[selectedSongIndex].title}`);

        // Stop current playback
        audioElement.pause();

        // Reset audio position to beginning
        audioElement.currentTime = 0;

        if (shouldPlay) {
            // Play from the beginning
            audioElement.play().catch(err => {
                console.error('Error playing live stream:', err);
            });
            isPlaying = true;
        } else {
            // Keep paused but ready to play from start
            isPlaying = false;
        }
    } else {
        // Same song selected
        if (shouldPlay) {
            // Just ensure it's playing
            if (!isPlaying) {
                audioElement.play().catch(err => {
                    console.error('Error playing live stream:', err);
                });
                isPlaying = true;
            }
        } else {
            // Stop playback
            audioElement.pause();
            isPlaying = false;
        }
    }
}

// Navigate to previous song
function navigateToPrevSong() {
    if (availableSongs.length === 0) return;

    const newIndex = selectedSongIndex - 1 < 0 ? availableSongs.length - 1 : selectedSongIndex - 1;
    selectSong(newIndex, true); // Navigate and play
}

// Navigate to next song
function navigateToNextSong() {
    if (availableSongs.length === 0) return;

    const newIndex = (selectedSongIndex + 1) % availableSongs.length;
    selectSong(newIndex, true); // Navigate and play
}

// Save metadata to database
async function saveMetadataToDatabase() {
    try {
        const response = await fetch(`${API_BASE}/metadata/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to save metadata:', response.statusText);
            return;
        }

        const result = await response.json();
        console.log('Metadata saved to database:', result);
    } catch (error) {
        console.error('Error saving metadata:', error);
    }
}

// Start metadata polling
function startMetadataPolling() {
    // Fetch immediately
    fetchMetadata();

    // Then poll every 10 seconds
    metadataInterval = setInterval(fetchMetadata, 10000);
}

// Stop metadata polling
function stopMetadataPolling() {
    if (metadataInterval) {
        clearInterval(metadataInterval);
        metadataInterval = null;
    }
}


// Initialize audio player
function initializeAudio() {
    if (audioPlaylist.length > 0) {
        loadTrack(currentTrackIndex);

        // Handle errors
        audioElement.addEventListener('error', (e) => {
            const currentTrack = audioPlaylist[currentTrackIndex];
            console.error(`Error loading live stream: ${currentTrack}`, e);
            alert('Unable to play live stream. Please check your connection and try again.');
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

        console.log(`Loading live stream: ${track}`);
        audioElement.src = track;

        // Start metadata polling for the live stream
        startMetadataPolling();
    }
}


// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Only if not typing in an input field
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === ' ') {
            e.preventDefault();
            const playBtn = document.getElementById('main-play-btn');
            if (playBtn) playBtn.click();
        }
    }
});

// Initialize audio on page load
initializeAudio();

// Initialize client ID on page load
getClientId();

// API Base URL
const API_BASE = '/api';

// Fetch ratings for a song
async function fetchRatings(artist, title) {
    try {
        const response = await fetch(`${API_BASE}/ratings/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (!response.ok) {
            console.error('Failed to fetch ratings:', response.statusText);
            return { thumbsUp: 0, thumbsDown: 0 };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching ratings:', error);
        return { thumbsUp: 0, thumbsDown: 0 };
    }
}

// Submit a rating for a song
async function submitRating(artist, title, ratingType) {
    try {
        const response = await fetch(`${API_BASE}/ratings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songArtist: artist,
                songTitle: title,
                ratingType: ratingType,
                clientId: getClientId()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to submit rating:', data.error);
            return { success: false, error: data.error };
        }

        // Save to localStorage
        saveRatedSong(artist, title, ratingType);

        return { success: true, data };
    } catch (error) {
        console.error('Error submitting rating:', error);
        return { success: false, error: error.message };
    }
}

// Delete a rating (cancel rating)
async function deleteRating(artist, title) {
    try {
        const response = await fetch(`${API_BASE}/ratings`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songArtist: artist,
                songTitle: title,
                clientId: getClientId()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to delete rating:', data.error);
            return { success: false, error: data.error };
        }

        // Remove from localStorage
        removeRatedSong(artist, title);

        return { success: true, data };
    } catch (error) {
        console.error('Error deleting rating:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to format duration in seconds to MM:SS
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

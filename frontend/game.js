/**
 * Agar.io Clone - Client-side game logic
 * Supports desktop (mouse) and mobile (touch) with haptic feedback
 */

// Game constants (should match backend config)
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

// Game state
let socket = null;
let playerId = null;
let playerData = null;
let gameState = {
    players: [],
    food: [],
    leaderboard: [],
    obstacles: []
};
// Interpolation variables
let stateBuffer = [];
const INTERPOLATION_OFFSET = 100; // ms delay to allow for smooth interpolation
let camera = { x: 0, y: 0 };
let mousePos = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
let isAlive = false;
let isMobile = false;
let currentTheme = 'light'; // 'light' or 'dark'

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const startScreen = document.getElementById('startScreen');
const deathScreen = document.getElementById('deathScreen');
const playerNameInput = document.getElementById('playerName');
const playButton = document.getElementById('playButton');
const respawnButton = document.getElementById('respawnButton');
const leaderboard = document.getElementById('leaderboard');
const leaderboardList = document.getElementById('leaderboardList');
const playerStats = document.getElementById('playerStats');
const playerMassSpan = document.getElementById('playerMass');
const playerRankSpan = document.getElementById('playerRank');
const finalMassSpan = document.getElementById('finalMass');
const connectionStatus = document.getElementById('connectionStatus');

/**
 * Detect if device is mobile and make canvas responsive
 */
function setupResponsiveCanvas() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Make canvas fullscreen
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

/**
 * Haptic feedback for mobile devices
 */
function vibrate(pattern = 10) {
    if (isMobile && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

/**
 * Toggle theme between light and dark
 */
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);

    // Update theme display
    const themeSpan = document.getElementById('currentTheme');
    if (themeSpan) {
        themeSpan.textContent = currentTheme === 'light' ? 'Light' : 'Dark';
    }

    vibrate(20);
    console.log('Theme switched to:', currentTheme);
}

/**
 * Initialize Socket.IO connection
 */
function initSocket() {
    socket = io({
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.background = 'rgba(0, 200, 0, 0.7)';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.style.background = 'rgba(200, 0, 0, 0.7)';
    });

    socket.on('player_joined', (data) => {
        playerId = data.playerId;
        playerData = data.player;
        isAlive = true;

        // Hide overlays, show game UI
        startScreen.classList.add('hidden');
        deathScreen.classList.add('hidden');
        leaderboard.classList.remove('hidden');
        playerStats.classList.remove('hidden');

        // Haptic feedback on spawn
        vibrate(50);

        console.log('Joined game as', playerData.name);
    });

    socket.on('game_state', (state) => {
        // Add timestamp to state
        state.timestamp = Date.now();
        stateBuffer.push(state);

        // Keep buffer small
        if (stateBuffer.length > 10) {
            stateBuffer.shift();
        }

        // Update non-interpolated data directly
        gameState.leaderboard = state.leaderboard;
        gameState.food = state.food; // Food doesn't move much, instant update is fine
        gameState.obstacles = state.obstacles;
    });

    socket.on('player_died', (data) => {
        if (data.playerId === playerId) {
            isAlive = false;

            // Show death screen
            if (playerData) {
                finalMassSpan.textContent = Math.round(playerData.mass);
            }
            deathScreen.classList.remove('hidden');
            leaderboard.classList.add('hidden');
            playerStats.classList.add('hidden');

            // Haptic feedback on death
            vibrate([100, 50, 100]);

            console.log('You died!');
        }
    });
}

/**
 * Join the game with player name
 */
function joinGame() {
    const name = playerNameInput.value.trim() || 'Anonymous';
    socket.emit('join_game', { name });
    vibrate(30);
}

/**
 * Respawn after death
 */
function respawn() {
    const name = playerNameInput.value.trim() || 'Anonymous';
    socket.emit('respawn', { name });
    vibrate(30);
}

/**
 * Send movement to server
 */
function sendMovement() {
    if (socket && isAlive) {
        socket.emit('player_move', {
            x: mousePos.x,
            y: mousePos.y
        });
    }
}

/**
 * Handle mouse movement (desktop)
 */
function handleMouseMove(event) {
    if (!isAlive) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to world coordinates
    mousePos.x = camera.x + canvasX;
    mousePos.y = camera.y + canvasY;
}

/**
 * Handle touch movement (mobile)
 */
function handleTouchMove(event) {
    event.preventDefault();
    if (!isAlive) return;

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to world coordinates
    mousePos.x = camera.x + canvasX;
    mousePos.y = camera.y + canvasY;
}

/**
 * Handle touch start (mobile - haptic feedback)
 */
function handleTouchStart(event) {
    event.preventDefault();
    vibrate(10);
    handleTouchMove(event);
}

/**
 * Update camera to follow player
 */
function updateCamera() {
    if (!playerData || !isAlive) return;

    // Find current player in game state
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (currentPlayer) {
        playerData = currentPlayer;

        // Smooth camera follow
        const targetX = currentPlayer.x - canvas.width / 2;
        const targetY = currentPlayer.y - canvas.height / 2;

        camera.x += (targetX - camera.x) * 0.1;
        camera.y += (targetY - camera.y) * 0.1;

        // Clamp camera to map bounds
        camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, camera.y));
    }
}

/**
 * Get interpolated game state for smooth rendering
 */
function getInterpolatedState() {
    const renderTime = Date.now() - INTERPOLATION_OFFSET;

    // If we don't have enough states, return latest or empty
    if (stateBuffer.length === 0) return gameState;
    if (stateBuffer.length === 1) return stateBuffer[0];

    // Find the two states surrounding the render time
    let previousState = null;
    let nextState = null;

    for (let i = stateBuffer.length - 1; i >= 0; i--) {
        if (stateBuffer[i].timestamp <= renderTime) {
            previousState = stateBuffer[i];
            nextState = stateBuffer[i + 1];
            break;
        }
    }

    // If we're behind the oldest state, just use the oldest
    if (!previousState) {
        return stateBuffer[0];
    }

    // If we're ahead of the newest state (shouldn't happen with sufficient offset), use the newest
    if (!nextState) {
        return stateBuffer[stateBuffer.length - 1];
    }

    // Calculate interpolation factor (0.0 to 1.0)
    const totalTime = nextState.timestamp - previousState.timestamp;
    const elapsedTime = renderTime - previousState.timestamp;
    const t = Math.max(0, Math.min(1, elapsedTime / totalTime));

    // Interpolate players
    const interpolatedPlayers = [];

    // Create a map of next players for easy lookup
    const nextPlayersMap = new Map(nextState.players.map(p => [p.id, p]));

    previousState.players.forEach(prevPlayer => {
        const nextPlayer = nextPlayersMap.get(prevPlayer.id);

        if (nextPlayer) {
            // Interpolate position and mass
            const interpolatedPlayer = {
                ...nextPlayer, // Copy other properties (name, color, etc.)
                x: prevPlayer.x + (nextPlayer.x - prevPlayer.x) * t,
                y: prevPlayer.y + (nextPlayer.y - prevPlayer.y) * t,
                mass: prevPlayer.mass + (nextPlayer.mass - prevPlayer.mass) * t,
                radius: prevPlayer.radius + (nextPlayer.radius - prevPlayer.radius) * t
            };
            interpolatedPlayers.push(interpolatedPlayer);
        } else {
            // Player disappeared in next state, maybe keep showing them for a frame or just drop
            // For now, we'll drop them to avoid ghosts
        }
    });

    // Also include new players that appeared in nextState but weren't in previousState
    // (Optional: could fade them in, but instant appearance is standard)
    nextState.players.forEach(nextPlayer => {
        if (!previousState.players.find(p => p.id === nextPlayer.id)) {
            interpolatedPlayers.push(nextPlayer);
        }
    });

    return {
        ...gameState,
        players: interpolatedPlayers
    };
}

/**
 * Render the game
 */
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    drawGrid();

    // Draw obstacles (safe zones)
    if (gameState.obstacles) {
        gameState.obstacles.forEach(obstacle => {
            drawObstacle(obstacle);
        });
    }

    // Draw food
    gameState.food.forEach(food => {
        drawCircle(
            food.x - camera.x,
            food.y - camera.y,
            food.radius,
            food.color
        );
    });

    // Get interpolated state for rendering
    const renderState = getInterpolatedState();

    // Update camera based on interpolated player position
    // We need to update global playerData reference for camera to work correctly with interpolation
    const currentInterpolatedPlayer = renderState.players.find(p => p.id === playerId);
    if (currentInterpolatedPlayer) {
        // Update the global playerData with interpolated values so camera follows smoothly
        playerData = currentInterpolatedPlayer;
    }

    // Draw players (sorted by mass so larger players draw on top)
    const sortedPlayers = [...renderState.players].sort((a, b) => a.mass - b.mass);
    sortedPlayers.forEach(player => {
        const isCurrentPlayer = player.id === playerId;

        // Draw player circle
        drawCircle(
            player.x - camera.x,
            player.y - camera.y,
            player.radius,
            player.color,
            isCurrentPlayer
        );

        // Draw player name
        drawText(
            player.name,
            player.x - camera.x,
            player.y - camera.y,
            player.radius
        );
    });

    // Update UI
    updateUI();
}

/**
 * Draw grid background
 */
function drawGrid() {
    const gridColor = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    // Vertical lines
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
}

/**
 * Draw an obstacle (safe zone)
 */
// Load assets
const safeZoneImg = new Image();
safeZoneImg.src = '/static/assets/safe_zone.png';

/**
 * Draw an obstacle (safe zone)
 */
/**
 * Draw an obstacle (safe zone)
 */
function drawObstacle(obstacle) {
    const x = obstacle.x - camera.x;
    const y = obstacle.y - camera.y;
    const centerX = x + obstacle.width / 2;
    const centerY = y + obstacle.height / 2;

    // Use a slightly larger size for the image to make it pop
    const size = Math.max(obstacle.width, obstacle.height) * 1.2;
    const imgX = centerX - size / 2;
    const imgY = centerY - size / 2;

    if (safeZoneImg.complete && safeZoneImg.naturalWidth !== 0) {
        // Draw the cute image
        ctx.drawImage(safeZoneImg, imgX, imgY, size, size);

        // Draw label below the image
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Safe Zone', centerX, centerY + size * 0.3);
        ctx.shadowColor = 'transparent';

    } else {
        // Fallback to gradient if image not loaded
        // Draw shadow first
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // Create gradient fill for safe zone
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, Math.max(obstacle.width, obstacle.height) * 0.7
        );

        if (currentTheme === 'light') {
            gradient.addColorStop(0, '#e8f4f8');
            gradient.addColorStop(0.5, '#b8dce8');
            gradient.addColorStop(1, '#88c4d8');
        } else {
            gradient.addColorStop(0, '#2a4858');
            gradient.addColorStop(0.5, '#1a3848');
            gradient.addColorStop(1, '#0a2838');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, obstacle.width, obstacle.height);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw border
        ctx.strokeStyle = '#4a9ecc';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, obstacle.width, obstacle.height);

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Safe Zone', centerX, centerY);
    }
}

/**
 * Draw a circle
 */
function drawCircle(x, y, radius, color, isCurrentPlayer = false) {
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Draw main circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Add prominent outline
    if (isCurrentPlayer) {
        // Animated glow effect for current player
        const time = Date.now() / 1000;
        const pulseSize = 3 + Math.sin(time * 3) * 2;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(x, y, radius + pulseSize + 4, 0, Math.PI * 2);
        const outerGlow = ctx.createRadialGradient(x, y, radius, x, y, radius + pulseSize + 6);
        outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        outerGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // Main golden border
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Inner white highlight
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else {
        // Regular outline for other players/food
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Subtle white highlight
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

/**
 * Draw text (player name)
 */
function drawText(text, x, y, playerRadius) {
    // Calculate font size based on circle radius
    // Smaller circles get smaller text, larger circles get larger text
    let fontSize;
    if (playerRadius < 15) {
        fontSize = 10;
    } else if (playerRadius < 25) {
        fontSize = 12;
    } else if (playerRadius < 40) {
        fontSize = 14;
    } else if (playerRadius < 60) {
        fontSize = 18;
    } else if (playerRadius < 80) {
        fontSize = 22;
    } else {
        fontSize = 26;
    }

    // Set font with calculated size
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure text width to ensure it fits in circle
    const textWidth = ctx.measureText(text).width;
    const maxWidth = playerRadius * 1.8; // Text should fit within circle diameter

    // If text is too wide, truncate with ellipsis
    let displayText = text;
    if (textWidth > maxWidth) {
        // Try to fit text by reducing it
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        displayText = truncated + '...';
    }

    // Draw text with strong outline for better visibility
    // Black outline (thicker for larger text)
    const outlineWidth = Math.max(3, fontSize / 5);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = outlineWidth;
    ctx.strokeText(displayText, x, y);

    // White text fill
    ctx.fillStyle = 'white';
    ctx.fillText(displayText, x, y);
}

/**
 * Update UI elements
 */
function updateUI() {
    // Update player stats
    if (playerData && isAlive) {
        playerMassSpan.textContent = Math.round(playerData.mass);

        // Find player rank
        const rank = gameState.leaderboard.findIndex(p => p.name === playerData.name) + 1;
        playerRankSpan.textContent = rank > 0 ? `#${rank}` : '-';
    }

    // Update leaderboard
    leaderboardList.innerHTML = gameState.leaderboard
        .map(player => `<li>${player.name}: ${Math.round(player.mass)}</li>`)
        .join('');
}

/**
 * Game loop
 */
function gameLoop() {
    updateCamera();
    render();
    requestAnimationFrame(gameLoop);
}

/**
 * Initialize the game
 */
function init() {
    setupResponsiveCanvas();
    initSocket();

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Random name generator
    const randomNames = [
        "Blobby", "Chunky", "Wobbly", "Squishy", "Puff",
        "Zippy", "Bouncy", "Fluffy", "Spiky", "Gloopy",
        "Turbo", "Sonic", "Flash", "Dash", "Zoom",
        "Titan", "Goliath", "Rex", "Boss", "King",
        "Ninja", "Shadow", "Ghost", "Viper", "Cobra",
        "Luna", "Star", "Comet", "Nova", "Cosmos",
        "Cookie", "Muffin", "Taco", "Pizza", "Burger"
    ];

    function generateRandomName() {
        const name = randomNames[Math.floor(Math.random() * randomNames.length)];
        playerNameInput.value = name;
        vibrate(10);
    }

    // Initialize with a random name
    generateRandomName();

    // Random name button
    const randomNameBtn = document.getElementById('randomNameBtn');
    if (randomNameBtn) {
        randomNameBtn.addEventListener('click', generateRandomName);
    }

    // Event listeners
    playButton.addEventListener('click', joinGame);
    respawnButton.addEventListener('click', respawn);

    // Enter key to play/respawn
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGame();
            vibrate(30);
        }
    });

    // Mouse controls (desktop)
    canvas.addEventListener('mousemove', handleMouseMove);

    // Double click to boost (desktop)
    canvas.addEventListener('dblclick', () => {
        if (isAlive) {
            socket.emit('player_boost', {});
            vibrate(50);
            console.log('Boost activated!');
        }
    });

    // Touch controls (mobile)
    let lastTouchTime = 0;
    canvas.addEventListener('touchstart', (e) => {
        handleTouchStart(e);

        // Double tap detection
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTouchTime;
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (isAlive) {
                socket.emit('player_boost', {});
                vibrate(50);
                console.log('Boost activated (mobile)!');
            }
            e.preventDefault();
        }
        lastTouchTime = currentTime;
    }, { passive: false });

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', () => vibrate(10), { passive: false });

    // Send movement updates periodically
    setInterval(sendMovement, 50); // 20 times per second

    // Start render loop
    gameLoop();

    console.log('Game initialized');
    console.log('Mobile device:', isMobile);
}

// Start the game when page loads
window.addEventListener('load', init);

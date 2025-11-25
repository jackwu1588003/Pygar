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
        themeSpan.textContent = currentTheme === 'light' ? '淺色' : '深色';
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
        gameState = state;
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

    // Draw players (sorted by mass so larger players draw on top)
    const sortedPlayers = [...gameState.players].sort((a, b) => a.mass - b.mass);
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
function drawObstacle(obstacle) {
    const x = obstacle.x - camera.x;
    const y = obstacle.y - camera.y;

    // Obstacle fill
    const obstacleColor = currentTheme === 'light' ? '#d0d0d0' : '#4a4a4a';
    ctx.fillStyle = obstacleColor;
    ctx.fillRect(x, y, obstacle.width, obstacle.height);

    // Border
    const borderColor = currentTheme === 'light' ? '#999' : '#666';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, obstacle.width, obstacle.height);

    // Label
    ctx.fillStyle = currentTheme === 'light' ? '#666' : '#ccc';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('安全區', x + obstacle.width / 2, y + obstacle.height / 2);
}

/**
 * Draw a circle
 */
function drawCircle(x, y, radius, color, isCurrentPlayer = false) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Add glow effect for current player
    if (isCurrentPlayer) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

/**
 * Draw text
 */
function drawText(text, x, y, maxWidth) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
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

    // Touch controls (mobile)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
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

# 🎮 Agar.io Clone - Multiplayer Game

A lightweight, multiplayer clone of Agar.io built with Python, FastAPI, and Socket.IO. Optimized for 100+ concurrent players with spatial hashing collision detection.

## ✨ Features

- **Real-time Multiplayer**: Up to 100+ concurrent players
- **Optimized Performance**: Spatial hashing for O(1) collision detection
- **Cross-Platform**: Works on desktop, mobile, and tablet
- **Touch Controls**: Full touch support with haptic feedback for mobile devices
- **Responsive Design**: Adapts to different screen sizes
- **Modern UI**: Dark theme with glassmorphism effects

## 🎯 Game Mechanics

- Control a cell that follows your mouse/touch
- Eat food to grow larger
- Eat smaller players to absorb their mass
- Movement speed decreases as you grow
- Real-time leaderboard

## 🏗️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, python-socketio
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Deployment**: Docker, optimized for Zeabur PaaS

## 📁 Project Structure

```
Pygar/
├── backend/
│   ├── __init__.py
│   ├── main.py           # FastAPI + Socket.IO server
│   ├── game_state.py     # Game logic and state management
│   ├── spatial_hash.py   # Spatial hashing for collision detection
│   └── config.py         # Game constants
├── frontend/
│   ├── index.html        # Game UI
│   ├── game.js           # Client-side logic
│   └── styles.css        # Styling
├── requirements.txt      # Python dependencies
├── Dockerfile           # Production container
└── README.md
```

## 🚀 Local Development

### Prerequisites

- Python 3.11 or higher
- pip

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd /Users/wujunyi/PycharmProjects/Pygar
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   uvicorn backend.main:socket_app --reload --host 0.0.0.0 --port 8000
   ```

4. **Open your browser**:
   Navigate to `http://localhost:8000`

5. **Test multiplayer**:
   Open multiple browser tabs/windows to simulate multiple players

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
docker build -t agar-clone .

# Run the container
docker run -p 8000:8000 agar-clone

# Access the game
# Navigate to http://localhost:8000
```

## ☁️ Zeabur Deployment

### Method 1: Deploy from GitHub

1. Push your code to a GitHub repository
2. Go to [Zeabur Dashboard](https://zeabur.com)
3. Create a new project
4. Connect your GitHub repository
5. Zeabur will auto-detect the Dockerfile and deploy

### Method 2: Deploy via Zeabur CLI

```bash
# Install Zeabur CLI
npm install -g @zeabur/cli

# Login to Zeabur
zeabur login

# Deploy
zeabur deploy
```

### Environment Variables (Optional)

You can configure these in Zeabur dashboard if needed:

- `PORT`: Server port (default: 8000)
- `LOG_LEVEL`: Logging level (default: info)

## 🎮 How to Play

### Desktop
- Move your mouse to control your cell
- Eat food (small colored dots) to grow
- Eat players smaller than you to gain their mass
- Avoid being eaten by larger players!

### Mobile/Tablet
- Touch and drag to control your cell
- Haptic feedback on interactions
- Responsive controls optimized for touch

## 🔧 Configuration

Game settings can be adjusted in `backend/config.py`:

- **MAP_WIDTH/HEIGHT**: Game world size (default: 2000x2000)
- **TICK_RATE**: Server update rate (default: 20 TPS)
- **FOOD_COUNT**: Number of food items (default: 200)
- **PLAYER_BASE_SPEED**: Base movement speed (default: 300)
- **MAX_PLAYERS**: Maximum concurrent players (default: 100)

## 📊 Performance

- **Spatial Hashing**: Divides map into a 10x10 grid for O(1) collision queries
- **Tick Rate**: 20 TPS (50ms per tick) for smooth gameplay
- **Bandwidth**: Optimized state updates sent 20 times per second
- **Scalability**: Handles 100+ concurrent connections efficiently

## 🐛 Troubleshooting

### Server won't start
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is available
- Try a different port: `uvicorn backend.main:socket_app --port 8001`

### High latency
- Check your network connection
- Reduce TICK_RATE in config.py if server is overloaded
- Ensure Docker has enough resources allocated

### Mobile touch not working
- Ensure you're using HTTPS (required for vibration API)
- Check browser console for errors
- Try a different mobile browser

## 📝 License

This is an educational project. Feel free to use and modify as needed.

## 🙏 Acknowledgments

- Inspired by the original [Agar.io](https://agar.io)
- Built for learning purposes with modern web technologies

---

**Made with ❤️ using FastAPI and Socket.IO**

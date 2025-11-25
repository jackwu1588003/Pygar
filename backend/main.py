"""
FastAPI server with Socket.IO for multiplayer Agar.io clone
"""

import asyncio
import time
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import socketio
from backend.game_state import GameState
from backend.config import TICK_INTERVAL

# Create FastAPI app
app = FastAPI(title="Agar.io Clone")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Wrap with ASGI app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    static_files={
        '/': {'content_type': 'text/html', 'filename': 'frontend/index.html'},
    }
)

# Mount static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Game state instance
game = GameState()

# Track connected players
connected_players = {}


@app.get("/")
async def read_root():
    """Serve the main game page"""
    return FileResponse('frontend/index.html')


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment platforms"""
    return {
        "status": "healthy",
        "players": len(connected_players),
        "food": len(game.food)
    }


@sio.event
async def connect(sid, environ):
    """Handle player connection"""
    print(f"Player connected: {sid}")
    connected_players[sid] = {'joined': False}


@sio.event
async def disconnect(sid):
    """Handle player disconnection"""
    print(f"Player disconnected: {sid}")
    
    if sid in connected_players:
        # Remove player from game
        game.remove_player(sid)
        del connected_players[sid]


@sio.event
async def join_game(sid, data):
    """Handle player joining the game with a name"""
    player_name = data.get('name', 'Anonymous')
    
    # Add player to game
    player = game.add_player(sid, player_name)
    connected_players[sid]['joined'] = True
    
    print(f"Player {player_name} ({sid}) joined the game")
    
    # Send initial state to the player
    await sio.emit('player_joined', {
        'playerId': sid,
        'player': player.to_dict()
    }, room=sid)


@sio.event
async def player_move(sid, data):
    """Handle player movement updates (mouse position)"""
    if sid not in connected_players or not connected_players[sid]['joined']:
        return
    
    target_x = data.get('x', 0)
    target_y = data.get('y', 0)
    
    game.update_player_target(sid, target_x, target_y)


@sio.event
async def respawn(sid, data):
    """Handle player respawn request"""
    player_name = data.get('name', 'Anonymous')
    
    # Remove old player and add new one
    game.remove_player(sid)
    player = game.add_player(sid, player_name)
    
    print(f"Player {player_name} ({sid}) respawned")
    
    # Send respawn confirmation
    await sio.emit('player_joined', {
        'playerId': sid,
        'player': player.to_dict()
    }, room=sid)


async def game_loop():
    """Main game loop running at TICK_RATE"""
    last_time = time.time()
    
    while True:
        current_time = time.time()
        delta_time = current_time - last_time
        last_time = current_time
        
        # Update game state
        game.update(delta_time)
        
        # Get current state
        state = game.get_state_for_client()
        
        # Notify dead players
        for player in game.players.values():
            if not player.alive:
                await sio.emit('player_died', {'playerId': player.id}, room=player.id)
        
        # Broadcast state to all connected clients
        await sio.emit('game_state', state)
        
        # Sleep until next tick
        await asyncio.sleep(TICK_INTERVAL)


@app.on_event("startup")
async def startup_event():
    """Start the game loop when the server starts"""
    asyncio.create_task(game_loop())
    print("Game server started!")
    print(f"Tick rate: {1/TICK_INTERVAL} TPS")
    print(f"Initial food count: {len(game.food)}")


# Export the ASGI app for uvicorn
# Use: uvicorn backend.main:socket_app

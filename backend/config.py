"""
Game configuration and constants for Agar.io clone
"""

# Map Configuration
MAP_WIDTH = 2000
MAP_HEIGHT = 2000

# Spatial Hashing Grid Configuration
GRID_CELL_SIZE = 200  # Each grid cell is 200x200 pixels
GRID_WIDTH = MAP_WIDTH // GRID_CELL_SIZE  # 10 cells
GRID_HEIGHT = MAP_HEIGHT // GRID_CELL_SIZE  # 10 cells

# Player Configuration
PLAYER_START_MASS = 50  # Increased from 10 for better starting size
PLAYER_BASE_SPEED = 600  # Increased to compensate for higher start mass
PLAYER_MIN_RADIUS = 10
PLAYER_MAX_RADIUS = 100
PLAYER_RADIUS_MULTIPLIER = 1.5  # radius = sqrt(mass) * multiplier

# Food Configuration
FOOD_COUNT = 200  # Number of food items on map
FOOD_MASS = 5
FOOD_RADIUS = 8  # Increased from 5 for better visibility
FOOD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
               '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C285']

# Game Mechanics
EAT_MASS_RATIO = 1.1  # Player must be 10% larger to eat another player
SPEED_MASS_EXPONENT = 0.5  # speed = BASE_SPEED / (mass ** 0.5)

# Server Configuration
TICK_RATE = 20  # Game updates per second (20 TPS = 50ms per tick)
TICK_INTERVAL = 1.0 / TICK_RATE
MAX_PLAYERS = 100

# Viewport Configuration (for client reference)
VIEWPORT_WIDTH = 800
VIEWPORT_HEIGHT = 600

# Obstacle Configuration (躲避空間 - Safe zones/obstacles)
OBSTACLES = [
    # Format: (x, y, width, height) - rectangular safe zones
    (400, 400, 200, 200),    # Center obstacle
    (100, 100, 150, 150),    # Top-left
    (1750, 100, 150, 150),   # Top-right
    (100, 1750, 150, 150),   # Bottom-left
    (1750, 1750, 150, 150),  # Bottom-right
]

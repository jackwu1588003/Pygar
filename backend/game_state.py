"""
Game state management including players, food, and collision detection
"""

import math
import random
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from backend.config import (
    MAP_WIDTH, MAP_HEIGHT, PLAYER_START_MASS, PLAYER_BASE_SPEED,
    PLAYER_RADIUS_MULTIPLIER, FOOD_COUNT, FOOD_MASS, FOOD_RADIUS,
    FOOD_COLORS, EAT_MASS_RATIO, SPEED_MASS_EXPONENT, OBSTACLES
)
from backend.spatial_hash import SpatialHashGrid


@dataclass
class Player:
    """Represents a player in the game"""
    id: str
    name: str
    x: float
    y: float
    mass: float = PLAYER_START_MASS
    target_x: float = 0
    target_y: float = 0
    color: str = '#3498db'
    alive: bool = True
    
    @property
    def radius(self) -> float:
        """Calculate radius based on mass"""
        return math.sqrt(self.mass) * PLAYER_RADIUS_MULTIPLIER
    
    @property
    def speed(self) -> float:
        """Calculate speed based on mass (decreases as mass increases)"""
        return PLAYER_BASE_SPEED / (self.mass ** SPEED_MASS_EXPONENT)
    
    def to_dict(self) -> dict:
        """Convert player to dictionary for network transmission"""
        return {
            'id': self.id,
            'name': self.name,
            'x': round(self.x, 2),
            'y': round(self.y, 2),
            'mass': round(self.mass, 2),
            'radius': round(self.radius, 2),
            'color': self.color
        }


@dataclass
class Food:
    """Represents a food item"""
    id: str
    x: float
    y: float
    color: str
    mass: float = FOOD_MASS
    radius: float = FOOD_RADIUS
    
    def to_dict(self) -> dict:
        """Convert food to dictionary for network transmission"""
        return {
            'id': self.id,
            'x': round(self.x, 2),
            'y': round(self.y, 2),
            'color': self.color,
            'radius': self.radius
        }


class GameState:
    """Manages the entire game state"""
    
    def __init__(self):
        self.players: Dict[str, Player] = {}
        self.food: Dict[str, Food] = {}
        self.spatial_grid = SpatialHashGrid()
        self.next_food_id = 0
        
        # Initialize food
        self._spawn_initial_food()
    
    def _spawn_initial_food(self):
        """Spawn initial food items on the map"""
        for _ in range(FOOD_COUNT):
            self._spawn_food()
    
    def _spawn_food(self):
        """Spawn a single food item at a random location"""
        food_id = f"food_{self.next_food_id}"
        self.next_food_id += 1
        
        food = Food(
            id=food_id,
            x=random.uniform(0, MAP_WIDTH),
            y=random.uniform(0, MAP_HEIGHT),
            color=random.choice(FOOD_COLORS)
        )
        
        self.food[food_id] = food
        self.spatial_grid.insert(food_id, food.x, food.y, food.radius)
    
    def add_player(self, player_id: str, name: str) -> Player:
        """Add a new player to the game"""
        player = Player(
            id=player_id,
            name=name,
            x=random.uniform(100, MAP_WIDTH - 100),
            y=random.uniform(100, MAP_HEIGHT - 100),
            color=f"#{random.randint(0, 0xFFFFFF):06x}"
        )
        
        self.players[player_id] = player
        self.spatial_grid.insert(player_id, player.x, player.y, player.radius)
        return player
    
    def remove_player(self, player_id: str):
        """Remove a player from the game"""
        if player_id in self.players:
            self.spatial_grid.remove(player_id)
            del self.players[player_id]
    
    def update_player_target(self, player_id: str, target_x: float, target_y: float):
        """Update where the player is trying to move"""
        if player_id in self.players:
            self.players[player_id].target_x = target_x
            self.players[player_id].target_y = target_y
    
    def update(self, delta_time: float):
        """Update game state (called every tick)"""
        # Update player positions
        for player in self.players.values():
            if not player.alive:
                continue
            
            # Calculate movement direction
            dx = player.target_x - player.x
            dy = player.target_y - player.y
            distance = math.sqrt(dx * dx + dy * dy)
            
            if distance > 5:  # Dead zone to prevent jittering
                # Normalize direction
                dx /= distance
                dy /= distance
                
                # Move player based on speed
                move_distance = player.speed * delta_time
                player.x += dx * move_distance
                player.y += dy * move_distance
                
                # Clamp to map boundaries
                player.x = max(player.radius, min(MAP_WIDTH - player.radius, player.x))
                player.y = max(player.radius, min(MAP_HEIGHT - player.radius, player.y))
                
                # Update spatial grid
                self.spatial_grid.insert(player.id, player.x, player.y, player.radius)
        
        # Check collisions
        self._check_collisions()
    
    def _check_collisions(self):
        """Check for collisions between players and food, and between players"""
        for player in list(self.players.values()):
            if not player.alive:
                continue
            
            # Query spatial grid for potential collisions
            potential_collisions = self.spatial_grid.query(
                player.x, player.y, player.radius
            )
            
            # Check collisions with food
            for entity_id in potential_collisions:
                if entity_id.startswith('food_') and entity_id in self.food:
                    food = self.food[entity_id]
                    
                    # Check if player overlaps with food
                    distance = math.sqrt(
                        (player.x - food.x) ** 2 + (player.y - food.y) ** 2
                    )
                    
                    if distance < player.radius:
                        # Player eats food
                        player.mass += food.mass
                        self.spatial_grid.remove(entity_id)
                        del self.food[entity_id]
                        
                        # Spawn new food to maintain count
                        self._spawn_food()
            
            # Check collisions with other players
            for entity_id in potential_collisions:
                if entity_id in self.players and entity_id != player.id:
                    other_player = self.players[entity_id]
                    
                    if not other_player.alive:
                        continue
                    
                    # Check if players overlap
                    distance = math.sqrt(
                        (player.x - other_player.x) ** 2 + 
                        (player.y - other_player.y) ** 2
                    )
                    
                    # Determine if one can eat the other
                    if player.mass > other_player.mass * EAT_MASS_RATIO:
                        if distance < player.radius:
                            # Player eats other player
                            player.mass += other_player.mass
                            other_player.alive = False
                            self.spatial_grid.remove(other_player.id)
                    elif other_player.mass > player.mass * EAT_MASS_RATIO:
                        if distance < other_player.radius:
                            # Other player eats this player
                            other_player.mass += player.mass
                            player.alive = False
                            self.spatial_grid.remove(player.id)
                            break
    
    def get_leaderboard(self, limit: int = 10) -> List[dict]:
        """Get top players by mass"""
        alive_players = [p for p in self.players.values() if p.alive]
        sorted_players = sorted(alive_players, key=lambda p: p.mass, reverse=True)
        return [
            {'name': p.name, 'mass': round(p.mass, 2)}
            for p in sorted_players[:limit]
        ]
    
    def get_state_for_client(self) -> dict:
        """Get the current game state for broadcasting to clients"""
        return {
            'players': [p.to_dict() for p in self.players.values() if p.alive],
            'food': [f.to_dict() for f in self.food.values()],
            'leaderboard': self.get_leaderboard(),
            'obstacles': [{'x': x, 'y': y, 'width': w, 'height': h} for x, y, w, h in OBSTACLES]
        }


"""
Spatial Hashing Grid for efficient collision detection
Divides the game map into a grid to achieve O(1) collision queries
instead of O(n²) comparisons
"""

from typing import Dict, List, Set, Tuple
try:
    from backend.config import GRID_CELL_SIZE, GRID_WIDTH, GRID_HEIGHT
except ImportError:
    from config import GRID_CELL_SIZE, GRID_WIDTH, GRID_HEIGHT


class SpatialHashGrid:
    """
    Spatial hash grid for fast collision detection.
    Divides the map into cells and tracks which entities are in each cell.
    """
    
    def __init__(self):
        # Dictionary mapping grid coordinates (x, y) to set of entity IDs
        self.grid: Dict[Tuple[int, int], Set[str]] = {}
        # Track which cell each entity is currently in
        self.entity_cells: Dict[str, Set[Tuple[int, int]]] = {}
    
    def _get_cell_coords(self, x: float, y: float) -> Tuple[int, int]:
        """Convert world coordinates to grid cell coordinates"""
        cell_x = int(x // GRID_CELL_SIZE)
        cell_y = int(y // GRID_CELL_SIZE)
        # Clamp to grid bounds
        cell_x = max(0, min(GRID_WIDTH - 1, cell_x))
        cell_y = max(0, min(GRID_HEIGHT - 1, cell_y))
        return (cell_x, cell_y)
    
    def _get_cells_for_entity(self, x: float, y: float, radius: float) -> Set[Tuple[int, int]]:
        """Get all grid cells that an entity overlaps based on its position and radius"""
        cells = set()
        
        # Calculate bounding box
        min_x = x - radius
        max_x = x + radius
        min_y = y - radius
        max_y = y + radius
        
        # Get all cells within bounding box
        min_cell = self._get_cell_coords(min_x, min_y)
        max_cell = self._get_cell_coords(max_x, max_y)
        
        for cx in range(min_cell[0], max_cell[0] + 1):
            for cy in range(min_cell[1], max_cell[1] + 1):
                cells.add((cx, cy))
        
        return cells
    
    def insert(self, entity_id: str, x: float, y: float, radius: float):
        """Insert or update an entity in the spatial hash"""
        # Remove from old cells if entity already exists
        if entity_id in self.entity_cells:
            self.remove(entity_id)
        
        # Get cells this entity overlaps
        cells = self._get_cells_for_entity(x, y, radius)
        
        # Add to grid
        for cell in cells:
            if cell not in self.grid:
                self.grid[cell] = set()
            self.grid[cell].add(entity_id)
        
        # Track which cells this entity is in
        self.entity_cells[entity_id] = cells
    
    def remove(self, entity_id: str):
        """Remove an entity from the spatial hash"""
        if entity_id not in self.entity_cells:
            return
        
        # Remove from all cells
        for cell in self.entity_cells[entity_id]:
            if cell in self.grid:
                self.grid[cell].discard(entity_id)
                # Clean up empty cells
                if not self.grid[cell]:
                    del self.grid[cell]
        
        # Remove from tracking
        del self.entity_cells[entity_id]
    
    def query(self, x: float, y: float, radius: float) -> Set[str]:
        """
        Query all entities that could potentially collide with an entity
        at the given position and radius
        """
        potential_collisions = set()
        
        # Get all cells this entity overlaps
        cells = self._get_cells_for_entity(x, y, radius)
        
        # Collect all entities in these cells
        for cell in cells:
            if cell in self.grid:
                potential_collisions.update(self.grid[cell])
        
        return potential_collisions
    
    def clear(self):
        """Clear all entities from the grid"""
        self.grid.clear()
        self.entity_cells.clear()

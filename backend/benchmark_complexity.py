
import time
import random
import sys
import os
import math

# Add current directory to path
sys.path.append(os.getcwd())

from backend.spatial_hash import SpatialHashGrid
from backend.config import GRID_WIDTH, GRID_HEIGHT, GRID_CELL_SIZE, MAP_WIDTH, MAP_HEIGHT

# Mock simple config if import fails or needed
# GRID_CELL_SIZE = 200
# MAP_WIDTH = 2000
# MAP_HEIGHT = 2000

class NaiveSystem:
    def __init__(self):
        self.entities = {} # id -> (x, y, r)

    def insert(self, entity_id, x, y, radius):
        self.entities[entity_id] = (x, y, radius)
    
    def clear(self):
        self.entities.clear()
        
    def solve_collisions(self):
        """
        Naive O(N^2) collision detection.
        Returns total number of collision checks performed and collisions found.
        """
        checks = 0
        collisions = 0
        ids = list(self.entities.keys())
        n = len(ids)
        
        for i in range(n):
            id1 = ids[i]
            x1, y1, r1 = self.entities[id1]
            
            for j in range(i + 1, n):
                id2 = ids[j]
                x2, y2, r2 = self.entities[id2]
                
                checks += 1
                # Distance squared check
                dx = x1 - x2
                dy = y1 - y2
                dist_sq = dx*dx + dy*dy
                rad_sum = r1 + r2
                if dist_sq < rad_sum * rad_sum:
                    collisions += 1
                    
        return checks, collisions

class SpatialSystem:
    def __init__(self):
        self.grid = SpatialHashGrid()
        self.entities = {} # id -> (x, y, r) needed for narrow phase
        
    def insert(self, entity_id, x, y, radius):
        self.entities[entity_id] = (x, y, radius)
        self.grid.insert(entity_id, x, y, radius)
        
    def clear(self):
        self.grid.clear()
        self.entities.clear()
        
    def solve_collisions(self):
        """
        Spatial Hash O(N) collision detection (Broad Phase + Narrow Phase).
        """
        checks = 0
        collisions = 0
        processed_pairs = set()
        
        for id1, (x1, y1, r1) in self.entities.items():
            # Broad Phase: Get candidates
            candidates = self.grid.query(x1, y1, r1)
            
            for id2 in candidates:
                if id1 == id2:
                    continue
                
                # Deduplicate pairs (since A collides B implies B collides A)
                # We can store a canonical pair key
                if id1 < id2:
                    pair = (id1, id2)
                else:
                    pair = (id2, id1)
                
                if pair in processed_pairs:
                    continue
                processed_pairs.add(pair)
                
                # Narrow Phase
                if id2 in self.entities: # specific check just in case
                    x2, y2, r2 = self.entities[id2]
                    checks += 1
                    dx = x1 - x2
                    dy = y1 - y2
                    dist_sq = dx*dx + dy*dy
                    rad_sum = r1 + r2
                    if dist_sq < rad_sum * rad_sum:
                        collisions += 1
                        
        return checks, collisions

def run_benchmark():
    print(f"Ben chmarking Collision Detection: Naive vs Spatial Hash")
    print(f"Map Size: {MAP_WIDTH}x{MAP_HEIGHT}, Grid Cell: {GRID_CELL_SIZE}")
    print("-" * 65)
    print(f"{'Entities':<10} | {'Method':<10} | {'Time (ms)':<10} | {'Checks (k)':<12} | {'Cols':<6}")
    print("-" * 65)

    counts = [100, 250, 500, 1000, 1500]
    
    for n in counts:
        # Generate random entities
        entities = []
        for i in range(n):
            entities.append({
                'id': str(i),
                'x': random.uniform(0, MAP_WIDTH),
                'y': random.uniform(0, MAP_HEIGHT),
                'r': random.uniform(10, 30)
            })
            
        # 1. Naive Benchmark
        naive = NaiveSystem()
        for e in entities:
            naive.insert(e['id'], e['x'], e['y'], e['r'])
            
        start_time = time.time()
        n_checks, n_cols = naive.solve_collisions()
        end_time = time.time()
        n_dur = (end_time - start_time) * 1000
        
        print(f"{n:<10} | {'Naive':<10} | {n_dur:<10.2f} | {n_checks/1000:<12.1f} | {n_cols:<6}")
        
        # 2. Spatial Benchmark
        spatial = SpatialSystem()
        # Include insert time? 
        # Usually physics update includes "Update Grid" + "Query".
        # But for fairness comparison of "Query Complexity", we focus on the solve step or include both.
        # Let's include clear+insert in the timing for the Spatial Hash to be fully rigorous about "Time per frame",
        # because the Naive approach doesn't need maintain a structure.
        # Disadvantage for Spatial Hash but realistic.
        
        start_time = time.time()
        spatial.clear()
        for e in entities:
            spatial.insert(e['id'], e['x'], e['y'], e['r'])
        
        s_checks, s_cols = spatial.solve_collisions()
        end_time = time.time()
        s_dur = (end_time - start_time) * 1000
        
        print(f"{n:<10} | {'Spatial':<10} | {s_dur:<10.2f} | {s_checks/1000:<12.1f} | {s_cols:<6}")
        print("-" * 65)

if __name__ == "__main__":
    run_benchmark()

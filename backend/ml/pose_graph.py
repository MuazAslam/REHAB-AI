from typing import Dict, List, Optional, Tuple, Any
import numpy as np

class PoseNode:
    """
    Represents a joint/node in the skeletal graph.
    Stores coordinate data and any computed properties (like angles).
    """
    def __init__(self, id: int, name: str, x: float, y: float, visibility: float):
        self.id = id
        self.name = name
        self.x = x
        self.y = y
        self.visibility = visibility
        self.angle: Optional[float] = None  # Angle formed at this node
        self.neighbors: List['PoseNode'] = []

    def set_angle(self, angle: float):
        self.angle = angle
    
    def add_neighbor(self, node: 'PoseNode'):
        if node not in self.neighbors:
            self.neighbors.append(node)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "x": self.x,
            "y": self.y,
            "angle": self.angle,
            "visibility": self.visibility
        }

class PoseEdge:
    """
    Represents a bone/connection between two joints.
    """
    def __init__(self, source: PoseNode, target: PoseNode):
        self.source = source
        self.target = target
        self.weight: float = 1.0 # Could store distance/length as weight

class PoseGraph:
    """
    DSA Graph Implementation for Pose Data.
    Nodes = Joints, Edges = Bones.
    """
    def __init__(self):
        self.nodes: Dict[int, PoseNode] = {}
        self.edges: List[PoseEdge] = []
        
        # Mapping of MediaPipe IDs to Names
        self.landmark_names = {
            11: "LeftShoulder", 12: "RightShoulder",
            13: "LeftElbow",    14: "RightElbow",
            15: "LeftWrist",    16: "RightWrist",
            23: "LeftHip",      24: "RightHip",
            25: "LeftKnee",     26: "RightKnee",
            27: "LeftAnkle",    28: "RightAnkle"
        }

    def add_node(self, id: int, x: float, y: float, visibility: float) -> Optional[PoseNode]:
        if id not in self.landmark_names:
            return None # Ignore non-relevant landmarks for this graph
            
        node = PoseNode(id, self.landmark_names[id], x, y, visibility)
        self.nodes[id] = node
        return node

    def add_edge(self, source_id: int, target_id: int):
        if source_id in self.nodes and target_id in self.nodes:
            src = self.nodes[source_id]
            tgt = self.nodes[target_id]
            
            # Add edge object
            edge = PoseEdge(src, tgt)
            self.edges.append(edge)
            
            # Update adjacency list (undirected for neighbors)
            src.add_neighbor(tgt)
            tgt.add_neighbor(src)

    def get_node(self, id: int) -> Optional[PoseNode]:
        return self.nodes.get(id)

    def compute_all_angles(self):
        """
        Calculates angles for all nodes that have 2 relevant neighbors 
        forming a joint (e.g., Elbow needs Shoulder and Wrist).
        """
        # Define triplets for angle calculation: (center, neighbor_1, neighbor_2)
        # Using specific IDs to ensure correct anatomy logic rather than generic graph traversal
        triplets = [
            (13, 11, 15), # Left Elbow (Shoulder, Wrist)
            (14, 12, 16), # Right Elbow
            (11, 13, 23), # Left Shoulder (Elbow, Hip)
            (12, 14, 24), # Right Shoulder
            (23, 11, 25), # Left Hip (Shoulder, Knee)
            (24, 12, 26), # Right Hip
            (25, 23, 27), # Left Knee (Hip, Ankle)
            (26, 24, 28)  # Right Knee
        ]
        
        for center_id, p1_id, p2_id in triplets:
            if center_id in self.nodes and p1_id in self.nodes and p2_id in self.nodes:
                center = self.nodes[center_id]
                p1 = self.nodes[p1_id]
                p2 = self.nodes[p2_id]
                
                angle = self._calculate_geometric_angle(p1, center, p2)
                center.set_angle(angle)

    def _calculate_geometric_angle(self, p1: PoseNode, center: PoseNode, p2: PoseNode) -> float:
        a = np.array([p1.x, p1.y])
        b = np.array([center.x, center.y])
        c = np.array([p2.x, p2.y])
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)

    def get_feature_vector(self) -> np.ndarray:
        """
        Returns the specific 8-angle vector required for the ML model.
        Order: [L_Elbow, L_Shoulder, L_Hip, L_Knee, R_Elbow, R_Shoulder, R_Hip, R_Knee]
        """
        # Order matters for LSTM
        ordered_ids = [13, 11, 23, 25, 14, 12, 24, 26] 
        features = []
        
        for nid in ordered_ids:
            node = self.nodes.get(nid)
            if node and node.angle is not None:
                features.append(node.angle)
            else:
                features.append(0.0) # Default if missing
                
        return np.array(features, dtype=np.float32)

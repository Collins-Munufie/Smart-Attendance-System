import os
import json
import numpy as np
import logging
from typing import Dict, Tuple, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Try importing FAISS
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS library not found. Falling back to native NumPy vector search.")

class FAISSIndexManager:
    def __init__(self):
        self.dim = settings.EMBEDDING_DIMENSION
        self.index_path = settings.FAISS_INDEX_PATH
        self.db_path = settings.ENROLLMENT_DB_PATH
        
        # User ID mapping: {faiss_id_int: user_id_str}
        self.id_to_user: Dict[int, str] = {}
        # Reverse mapping: {user_id_str: list of faiss_id_int}
        self.user_to_ids: Dict[str, List[int]] = {}
        
        self.faiss_available = FAISS_AVAILABLE
        self.index = None
        self.fallback_vectors: List[np.ndarray] = []
        self.fallback_ids: List[int] = []
        self.next_id = 0

        self.initialize_index()
        self.load()

    def initialize_index(self):
        """Initializes empty FAISS index or local storage."""
        if self.faiss_available:
            # We use IndexFlatIP (Inner Product) on L2 normalized vectors,
            # which computes exact Cosine Similarity.
            self.index = faiss.IndexFlatIP(self.dim)
            logger.info("FAISS IndexFlatIP initialized.")
        else:
            self.index = None
            self.fallback_vectors = []
            self.fallback_ids = []
            logger.info("NumPy Flat Inner Product index initialized.")

    def add_embedding(self, user_id: str, embedding: np.ndarray) -> bool:
        """
        Adds a single normalized face embedding for a user.
        """
        # Ensure embedding is float32 and L2 normalized
        embedding = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        current_faiss_id = self.next_id
        self.next_id += 1
        
        # Register in maps
        self.id_to_user[current_faiss_id] = user_id
        if user_id not in self.user_to_ids:
            self.user_to_ids[user_id] = []
        self.user_to_ids[user_id].append(current_faiss_id)
        
        if self.faiss_available:
            # Expand dimensions to (1, dim) for FAISS
            vector_batch = np.expand_dims(embedding, axis=0)
            self.index.add(vector_batch)
        else:
            self.fallback_vectors.append(embedding)
            self.fallback_ids.append(current_faiss_id)
            
        logger.info(f"Enrolled embedding for user {user_id} with index ID {current_faiss_id}")
        self.save()
        return True

    def search_embedding(self, embedding: np.ndarray, top_k: int = 1) -> List[Dict[str, any]]:
        """
        Searches the nearest neighbors.
        Returns: list of dicts: [{"user_id": str, "similarity": float}]
        """
        embedding = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        # If index is empty
        total_elements = self.index.ntotal if self.faiss_available else len(self.fallback_vectors)
        if total_elements == 0:
            return []

        top_k = min(top_k, total_elements)
        results = []

        if self.faiss_available:
            # FAISS search
            vector_query = np.expand_dims(embedding, axis=0)
            similarities, indices = self.index.search(vector_query, top_k)
            
            for sim, idx in zip(similarities[0], indices[0]):
                if idx == -1:
                    continue
                user_id = self.id_to_user.get(idx)
                if user_id:
                    results.append({
                        "user_id": user_id,
                        "similarity": float(sim)  # Cosine similarity since inputs are normalized
                    })
        else:
            # NumPy manual search (Cosine Similarity = Inner Product on normalized vectors)
            query = embedding
            similarities = []
            for vec, idx in zip(self.fallback_vectors, self.fallback_ids):
                sim = np.dot(query, vec)
                similarities.append((sim, idx))
                
            # Sort by similarity descending
            similarities.sort(key=lambda x: x[0], reverse=True)
            for sim, idx in similarities[:top_k]:
                user_id = self.id_to_user.get(idx)
                if user_id:
                    results.append({
                        "user_id": user_id,
                        "similarity": float(sim)
                    })
                    
        return results

    def get_user_embeddings(self, user_id: str) -> List[np.ndarray]:
        """Retrieves all registered face embedding vectors for a user."""
        if user_id not in self.user_to_ids:
            return []
            
        ids = self.user_to_ids[user_id]
        embeddings = []
        
        if self.faiss_available and self.index is not None:
            for idx in ids:
                try:
                    vec = self.index.reconstruct(idx)
                    embeddings.append(vec)
                except Exception as e:
                    logger.error(f"Error reconstructing vector for index {idx}: {e}")
        else:
            # Fallback mode
            for idx in ids:
                if idx in self.fallback_ids:
                    fallback_idx = self.fallback_ids.index(idx)
                    embeddings.append(self.fallback_vectors[fallback_idx])
                    
        return embeddings

    def remove_user(self, user_id: str) -> bool:
        """
        Deletes a user's embeddings from the database.
        Rebuilds the index to remove references.
        """
        if user_id not in self.user_to_ids:
            logger.warning(f"User {user_id} not found in database; cannot remove.")
            return False
            
        # Get IDs to drop
        ids_to_drop = set(self.user_to_ids[user_id])
        
        # Gather all keeping items
        keep_embeddings = []
        keep_user_ids = []
        
        # Gather current state
        if self.faiss_available:
            # FAISS doesn't support easy selective deletion in IndexFlat without rebuilding
            # We reconstruct the index with remaining vectors
            for idx, uid in self.id_to_user.items():
                if idx not in ids_to_drop:
                    # Retrieve vector from index
                    vec = self.index.reconstruct(idx)
                    keep_embeddings.append(vec)
                    keep_user_ids.append(uid)
        else:
            for vec, idx in zip(self.fallback_vectors, self.fallback_ids):
                if idx not in ids_to_drop:
                    keep_embeddings.append(vec)
                    keep_user_ids.append(self.id_to_user[idx])
                    
        # Reset index state
        self.initialize_index()
        self.id_to_user.clear()
        self.user_to_ids.clear()
        self.next_id = 0
        
        # Re-insert
        for uid, vec in zip(keep_user_ids, keep_embeddings):
            self.add_embedding(uid, vec)
            
        logger.info(f"Successfully deleted all embeddings for user {user_id}")
        self.save()
        return True

    def save(self):
        """Saves both FAISS bin index and JSON lookup tables to disk."""
        try:
            # Write mapping database JSON
            db_state = {
                "next_id": self.next_id,
                # Convert keys of dict to string for JSON compliance
                "id_to_user": {str(k): v for k, v in self.id_to_user.items()},
                "user_to_ids": self.user_to_ids
            }
            if not self.faiss_available:
                # Save vectors as list of floats in fallback mode
                db_state["fallback_vectors"] = [v.tolist() for v in self.fallback_vectors]
                db_state["fallback_ids"] = self.fallback_ids
                
            with open(self.db_path, "w") as f:
                json.dump(db_state, f, indent=4)
                
            # Write FAISS binary
            if self.faiss_available and self.index is not None:
                faiss.write_index(self.index, self.index_path)
                
            logger.info("Vector database saved successfully.")
        except Exception as e:
            logger.error(f"Error saving vector DB: {e}")

    def load(self):
        """Loads index and metadata from disk."""
        if not os.path.exists(self.db_path):
            logger.info("No enrollment database file found. Starting fresh.")
            return

        try:
            with open(self.db_path, "r") as f:
                db_state = json.load(f)
                
            self.next_id = db_state.get("next_id", 0)
            self.id_to_user = {int(k): v for k, v in db_state.get("id_to_user", {}).items()}
            self.user_to_ids = db_state.get("user_to_ids", {})
            
            if self.faiss_available and os.path.exists(self.index_path):
                self.index = faiss.read_index(self.index_path)
                logger.info(f"Loaded FAISS index containing {self.index.ntotal} vectors.")
            elif not self.faiss_available:
                self.fallback_vectors = [np.array(v, dtype=np.float32) for v in db_state.get("fallback_vectors", [])]
                self.fallback_ids = db_state.get("fallback_ids", [])
                logger.info(f"Loaded local vector list containing {len(self.fallback_vectors)} vectors.")
            else:
                logger.warning("FAISS is available but index file missing. Rebuilding index from JSON logs if possible.")
                # If JSON was saved without FAISS but we now have FAISS, we can load local if they exist.
                self.initialize_index()
                vectors_list = db_state.get("fallback_vectors", [])
                vectors_ids = db_state.get("fallback_ids", [])
                if vectors_list:
                    for idx, vec_arr in zip(vectors_ids, vectors_list):
                        vec = np.array(vec_arr, dtype=np.float32)
                        vector_batch = np.expand_dims(vec, axis=0)
                        self.index.add(vector_batch)
                        
            logger.info("Vector database loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load vector DB: {e}. Starting fresh.")
            self.initialize_index()

# Singleton instance
vector_db = FAISSIndexManager()

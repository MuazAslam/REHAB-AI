"""
Token Manager for Secure Video Feed Access
Generates and validates single-use, time-limited tokens
"""
import secrets
import time
from typing import Dict, Optional

class TokenManager:
    def __init__(self):
        # Store tokens with their expiry time and metadata
        # Format: {token: {'expires_at': timestamp, 'patient_id': str, 'exercise_name': str}}
        self.tokens: Dict[str, dict] = {}
    
    def generate_token(self, patient_id: str, exercise_name: str, exercise_id: str = None, ttl_seconds: int = 60) -> str:
        """
        Generate a cryptographically secure token
        
        Args:
            patient_id: Patient's user ID
            exercise_name: Name of the exercise (should be 'plank')
            exercise_id: Unique ID of the exercise assignment
            ttl_seconds: Time to live in seconds (default 60)
        
        Returns:
            URL-safe token string
        """
        # Generate a secure random token
        token = secrets.token_urlsafe(32)
        
        # Calculate expiry time
        expires_at = time.time() + ttl_seconds
        
        # Store token with metadata
        self.tokens[token] = {
            'expires_at': expires_at,
            'patient_id': patient_id,
            'exercise_name': exercise_name,
            'exercise_id': exercise_id
        }
        
        # Clean up expired tokens
        self._cleanup_expired()
        
        return token
    
    def validate_token(self, token: str) -> Optional[dict]:
        """
        Validate and consume a token (single-use)
        
        Args:
            token: Token to validate
        
        Returns:
            Token metadata if valid, None if invalid/expired
        """
        # Check if token exists
        if token not in self.tokens:
            return None
        
        token_data = self.tokens[token]
        
        # Check if token has expired
        if time.time() > token_data['expires_at']:
            # Remove expired token
            del self.tokens[token]
            return None
        
        # Token is valid - remove it (single-use)
        del self.tokens[token]
        
        return token_data
    
    def _cleanup_expired(self):
        """Remove all expired tokens from storage"""
        current_time = time.time()
        expired_tokens = [
            token for token, data in self.tokens.items()
            if current_time > data['expires_at']
        ]
        
        for token in expired_tokens:
            del self.tokens[token]

# Global token manager instance
token_manager = TokenManager()

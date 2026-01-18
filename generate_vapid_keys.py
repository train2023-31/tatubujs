#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push Notifications

Usage:
    python generate_vapid_keys.py

This will generate a private key (PEM format) and public key (base64url format)
that you can use for web push notifications.
"""

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64
import sys

def generate_vapid_keys():
    """Generate VAPID private (PEM) and public (base64url) keys."""
    # Generate EC private key using SECP256R1 curve
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    
    # Convert private key to PEM format
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    # Get public key
    public_key = private_key.public_key()
    
    # Get public key in uncompressed point format
    public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # Remove the first byte (0x04) which indicates uncompressed point
    public_key_bytes = public_key_bytes[1:]
    
    # Convert to base64url (URL-safe base64 without padding)
    public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).decode('utf-8').rstrip('=')

    return private_key_pem, public_key_b64

if __name__ == '__main__':
    try:
        private, public = generate_vapid_keys()
        
        print("=" * 60)
        print("VAPID Keys Generated Successfully")
        print("=" * 60)
        print("\n1. Private Key (PEM format):")
        print("-" * 60)
        print(private)
        print("\n2. Public Key (base64url format):")
        print("-" * 60)
        print(public)
        print("\n" + "=" * 60)
        print("Environment Variables:")
        print("=" * 60)
        print(f"VAPID_PRIVATE_KEY={private.strip()}")
        print(f"VAPID_PUBLIC_KEY={public}")
        print(f"REACT_APP_VAPID_PUBLIC_KEY={public}")
        print("=" * 60)
        print("\n⚠️  IMPORTANT: Keep the private key secret!")
        print("   Add these to your .env file or environment variables.")
        print("=" * 60)
        
    except ImportError as e:
        print("Error: Missing required library.")
        print("Install it with: pip install cryptography")
        sys.exit(1)
    except Exception as e:
        print(f"Error generating keys: {str(e)}")
        sys.exit(1)

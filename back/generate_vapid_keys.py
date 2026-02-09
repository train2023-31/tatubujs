#!/usr/bin/env python3
"""
VAPID Key Generator for Web Push Notifications
Generates a pair of VAPID keys (public/private) for use with pywebpush.

Usage:
    python generate_vapid_keys.py

This will output:
    - VAPID_PUBLIC_KEY: Add to frontend .env as REACT_APP_VAPID_PUBLIC_KEY
    - VAPID_PRIVATE_KEY: Add to backend .env (keep secret!)
    - VAPID_CLAIM_EMAIL: Your contact email (mailto:)
"""

try:
    from pywebpush import webpush
    import json
    import base64
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
except ImportError as e:
    print("❌ Error: Required package not installed")
    print("Please install: pip install pywebpush cryptography")
    print(f"Error details: {e}")
    exit(1)

def generate_vapid_keys():
    """Generate VAPID keys for web push notifications"""
    print("🔑 Generating VAPID Keys for Web Push Notifications...")
    print("=" * 60)
    
    try:
        # Generate private key using cryptography library
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        
        # Get public key from private key
        public_key = private_key.public_key()
        
        # Serialize private key to PEM format, then convert to urlsafe base64
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Serialize public key in uncompressed format
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        # Convert to urlsafe base64 (this is what the browser expects)
        public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
        
        # For private key, we need to extract the raw bytes
        private_numbers = private_key.private_numbers()
        private_value = private_numbers.private_value
        private_bytes = private_value.to_bytes(32, byteorder='big')
        private_key_b64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')
        
    except Exception as e:
        print(f"❌ Error with cryptography method: {e}")
        print("\nTrying alternative method with py_vapid...")
        
        # Fallback to older py_vapid method
        try:
            from py_vapid import Vapid01
            vapid = Vapid01()
            vapid.generate_keys()
            
            # Use save_key method to get the keys
            import io
            
            # Get private key
            private_buffer = io.StringIO()
            vapid.save_key(private_buffer)
            private_key_pem = private_buffer.getvalue()
            
            # Get public key
            public_buffer = io.StringIO()
            vapid.save_public_key(public_buffer)
            public_key_b64 = public_buffer.getvalue().strip()
            
            # Extract private key from PEM
            private_key_b64 = vapid.private_key
            
        except Exception as e2:
            print(f"❌ Fallback method also failed: {e2}")
            print("\nGenerating keys manually...")
            
            # Last resort: use pywebpush's built-in method
            from pywebpush import Vapid
            vapid = Vapid()
            vapid.generate_keys()
            
            # These should be base64url encoded strings
            public_key_b64 = vapid.public_key
            private_key_b64 = vapid.private_key
    
    print("\n✅ VAPID Keys Generated Successfully!\n")
    
    # Output for frontend (.env)
    print("📱 FRONTEND (.env file in /frontend folder):")
    print("-" * 60)
    print(f"REACT_APP_VAPID_PUBLIC_KEY={public_key_b64}")
    print()
    
    # Output for backend (.env)
    print("🔒 BACKEND (.env file in /back folder):")
    print("-" * 60)
    print(f"VAPID_PUBLIC_KEY={public_key_b64}")
    print(f"VAPID_PRIVATE_KEY={private_key_b64}")
    print("VAPID_CLAIM_EMAIL=mailto:your-email@example.com")
    print()
    
    # Save to files
    print("💾 Saving keys to files...")
    
    try:
        # Save public key for frontend
        with open('vapid_public_key.txt', 'w') as f:
            f.write(public_key_b64)
        print(f"   ✓ Public key saved to: vapid_public_key.txt")
        
        # Save private key for backend (with warning)
        with open('vapid_private_key.txt', 'w') as f:
            f.write(private_key_b64)
        print(f"   ✓ Private key saved to: vapid_private_key.txt")
        
        # Save both to JSON
        with open('vapid_keys.json', 'w') as f:
            json.dump({
                'public_key': public_key_b64,
                'private_key': private_key_b64,
                'claim_email': 'mailto:your-email@example.com'
            }, f, indent=2)
        print(f"   ✓ Both keys saved to: vapid_keys.json")
    except Exception as e:
        print(f"   ⚠️ Could not save to files: {e}")
    
    print()
    print("⚠️  IMPORTANT SECURITY NOTES:")
    print("-" * 60)
    print("1. The PUBLIC key goes in your FRONTEND .env file")
    print("2. The PRIVATE key goes in your BACKEND .env file")
    print("3. NEVER commit the private key to version control!")
    print("4. Add vapid_*.txt and vapid_keys.json to .gitignore")
    print("5. Replace 'your-email@example.com' with your actual contact email")
    print()
    print("📝 Next Steps:")
    print("-" * 60)
    print("1. Copy the REACT_APP_VAPID_PUBLIC_KEY to frontend/.env")
    print("2. Copy VAPID_PRIVATE_KEY and VAPID_CLAIM_EMAIL to back/.env")
    print("3. Restart both frontend and backend servers")
    print("4. Test push notifications!")
    print()
    
    return {
        'public_key': public_key_b64,
        'private_key': private_key_b64
    }

if __name__ == "__main__":
    try:
        keys = generate_vapid_keys()
    except Exception as e:
        print(f"\n❌ Error generating VAPID keys: {str(e)}")
        import traceback
        print(traceback.format_exc())
        print("\n💡 Alternative: Generate keys online at:")
        print("   https://vapidkeys.com/")
        print("   or")
        print("   https://web-push-codelab.glitch.me/")
        exit(1)


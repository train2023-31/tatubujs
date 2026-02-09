#!/usr/bin/env python3
"""
Simple VAPID Key Generator (Alternative Method)
Uses only pywebpush library without py_vapid dependency
"""

import os
import sys

try:
    from pywebpush import Vapid
    import json
except ImportError:
    print("❌ Error: pywebpush not installed")
    print("Install with: pip install pywebpush")
    sys.exit(1)

def generate_keys():
    """Generate VAPID keys using pywebpush's Vapid class"""
    print("🔑 Generating VAPID Keys...")
    print("=" * 60)
    
    # Create Vapid instance and generate keys
    vapid = Vapid()
    vapid.generate_keys()
    
    # Get the keys as strings
    # pywebpush's Vapid stores keys as strings already
    try:
        # Method 1: Direct access (newer versions)
        public_key = vapid.public_key
        private_key = vapid.private_key
    except AttributeError:
        # Method 2: Via save methods (older versions)
        import io
        
        # Save to string buffer
        private_buffer = io.StringIO()
        public_buffer = io.StringIO()
        
        vapid.save_key(private_buffer)
        vapid.save_public_key(public_buffer)
        
        private_key = private_buffer.getvalue().strip()
        public_key = public_buffer.getvalue().strip()
    
    print("\n✅ Keys Generated Successfully!\n")
    
    # Display keys
    print("📱 FRONTEND (.env):")
    print("-" * 60)
    print(f"REACT_APP_VAPID_PUBLIC_KEY={public_key}")
    print()
    
    print("🔒 BACKEND (.env):")
    print("-" * 60)
    print(f"VAPID_PUBLIC_KEY={public_key}")
    print(f"VAPID_PRIVATE_KEY={private_key}")
    print("VAPID_CLAIM_EMAIL=mailto:admin@yourdomain.com")
    print()
    
    # Save to files
    try:
        with open('vapid_public_key.txt', 'w') as f:
            f.write(public_key)
        
        with open('vapid_private_key.txt', 'w') as f:
            f.write(private_key)
        
        with open('vapid_keys.json', 'w') as f:
            json.dump({
                'public_key': public_key,
                'private_key': private_key
            }, f, indent=2)
        
        print("✅ Keys saved to files:")
        print("   - vapid_public_key.txt")
        print("   - vapid_private_key.txt")
        print("   - vapid_keys.json")
        print()
    except Exception as e:
        print(f"⚠️ Could not save files: {e}")
    
    print("⚠️  IMPORTANT:")
    print("   - Add public key to frontend/.env")
    print("   - Add private key to back/.env (KEEP SECRET!)")
    print("   - Never commit private key to git!")
    print()
    
    return public_key, private_key

if __name__ == "__main__":
    try:
        generate_keys()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Alternative: Use online generator:")
        print("   https://vapidkeys.com/")
        sys.exit(1)

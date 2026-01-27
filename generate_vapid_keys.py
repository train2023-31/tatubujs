#!/usr/bin/env python3
"""
Script to generate VAPID keys for Web Push Notifications
Usage: python generate_vapid_keys.py
"""

try:
    from py_vapid import Vapid01
    from cryptography.hazmat.primitives import serialization
    
    # Generate VAPID keys
    vapid = Vapid01()
    
    # Get public key (base64 URL-safe format)
    # py_vapid stores public key differently, we need to extract it properly
    public_key_bytes = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    import base64
    # VAPID public key is the raw bytes (skip the first byte which is 0x04)
    public_key_b64 = base64.urlsafe_b64encode(public_key_bytes[1:]).decode('utf-8').rstrip('=')
    
    # Get private key (PEM format)
    private_key_pem = vapid.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    print("=" * 70)
    print("VAPID Keys Generated Successfully!")
    print("=" * 70)
    print("\n📋 PUBLIC KEY (for Frontend & Backend .env):")
    print("-" * 70)
    print(public_key_b64)
    print("\n🔐 PRIVATE KEY (for Backend .env only):")
    print("-" * 70)
    print(private_key_pem)
    print("\n" + "=" * 70)
    print("✅ Copy these keys to your .env files")
    print("=" * 70)
    
except ImportError:
    print("❌ Error: py_vapid is not installed")
    print("\n📦 Install it using:")
    print("   pip install py_vapid")
    print("\n   or")
    print("   pip3 install py_vapid")
    
except Exception as e:
    print(f"❌ Error generating keys: {e}")
    print("\n🔄 Trying alternative method...")
    
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        import base64
        
        # Generate EC key pair
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()
        
        # Get public key in raw format
        public_key_raw = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        # Convert to base64 URL-safe
        public_key_b64 = base64.urlsafe_b64encode(public_key_raw[1:]).decode('utf-8').rstrip('=')
        
        # Get private key in PEM format
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        print("=" * 70)
        print("VAPID Keys Generated Successfully (Alternative Method)!")
        print("=" * 70)
        print("\n📋 PUBLIC KEY (for Frontend & Backend .env):")
        print("-" * 70)
        print(public_key_b64)
        print("\n🔐 PRIVATE KEY (for Backend .env only):")
        print("-" * 70)
        print(private_key_pem)
        print("\n" + "=" * 70)
        print("✅ Copy these keys to your .env files")
        print("=" * 70)
        
    except ImportError:
        print("❌ Error: cryptography library is not installed")
        print("\n📦 Install it using:")
        print("   pip install cryptography")
        print("\n   or")
        print("   pip3 install cryptography")
    except Exception as e2:
        print(f"❌ Error with alternative method: {e2}")
        print("\n💡 Try using online generator:")
        print("   https://web-push-codelab.glitch.me/")

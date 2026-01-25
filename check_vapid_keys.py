#!/usr/bin/env python3
"""
VAPID Keys Configuration Checker

This script checks if VAPID keys are properly configured in both:
- Backend (Python/Flask)
- Frontend (React)

Usage:
    python check_vapid_keys.py
"""

import os
import sys
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.RESET}")

def check_backend_config():
    """Check backend VAPID configuration"""
    print_header("BACKEND VAPID CONFIGURATION CHECK")
    
    backend_path = Path(__file__).parent / "back"
    config_file = backend_path / "app" / "config.py"
    
    if not config_file.exists():
        print_error(f"Config file not found: {config_file}")
        return False
    
    # Read config file
    with open(config_file, 'r', encoding='utf-8') as f:
        config_content = f.read()
    
    # Check if VAPID keys are defined
    has_public_key = 'VAPID_PUBLIC_KEY' in config_content
    has_private_key = 'VAPID_PRIVATE_KEY' in config_content
    has_claim_email = 'VAPID_CLAIM_EMAIL' in config_content
    
    print_info("Checking config.py file...")
    
    if has_public_key:
        print_success("VAPID_PUBLIC_KEY is defined in config.py")
    else:
        print_error("VAPID_PUBLIC_KEY is NOT defined in config.py")
    
    if has_private_key:
        print_success("VAPID_PRIVATE_KEY is defined in config.py")
    else:
        print_error("VAPID_PRIVATE_KEY is NOT defined in config.py")
    
    if has_claim_email:
        print_success("VAPID_CLAIM_EMAIL is defined in config.py")
    else:
        print_warning("VAPID_CLAIM_EMAIL is NOT defined in config.py")
    
    # Check environment variables
    print_info("\nChecking environment variables...")
    
    env_public = os.environ.get('VAPID_PUBLIC_KEY')
    env_private = os.environ.get('VAPID_PRIVATE_KEY')
    env_email = os.environ.get('VAPID_CLAIM_EMAIL')
    
    if env_public:
        print_success(f"VAPID_PUBLIC_KEY found in environment: {env_public[:30]}...")
    else:
        print_warning("VAPID_PUBLIC_KEY not found in environment (will use default from config.py)")
    
    if env_private:
        print_success(f"VAPID_PRIVATE_KEY found in environment: {env_private[:30]}...")
        if len(env_private) < 100:
            print_warning("VAPID_PRIVATE_KEY seems too short (should be PEM format)")
    else:
        print_error("VAPID_PRIVATE_KEY not found in environment!")
        print_info("This is REQUIRED for push notifications to work")
    
    if env_email:
        print_success(f"VAPID_CLAIM_EMAIL found in environment: {env_email}")
    else:
        print_warning("VAPID_CLAIM_EMAIL not found in environment (will use default)")
    
    # Check .env file
    env_file = backend_path / ".env"
    if env_file.exists():
        print_info(f"\nChecking .env file: {env_file}")
        with open(env_file, 'r', encoding='utf-8') as f:
            env_content = f.read()
        
        if 'VAPID_PUBLIC_KEY' in env_content:
            print_success("VAPID_PUBLIC_KEY found in .env")
        else:
            print_warning("VAPID_PUBLIC_KEY not found in .env")
        
        if 'VAPID_PRIVATE_KEY' in env_content:
            print_success("VAPID_PRIVATE_KEY found in .env")
        else:
            print_error("VAPID_PRIVATE_KEY not found in .env")
    else:
        print_warning(f".env file not found: {env_file}")
        print_info("You can create it to set environment variables")
    
    # Try to import and check actual values
    print_info("\nChecking actual config values...")
    try:
        sys.path.insert(0, str(backend_path))
        from app.config import Config
        
        public_key = Config.VAPID_PUBLIC_KEY
        private_key = Config.VAPID_PRIVATE_KEY
        claim_email = Config.VAPID_CLAIM_EMAIL
        
        if public_key and public_key != '':
            print_success(f"VAPID_PUBLIC_KEY value: {public_key[:50]}...")
            if len(public_key) < 50:
                print_warning("Public key seems too short")
        else:
            print_error("VAPID_PUBLIC_KEY is empty!")
        
        if private_key and private_key != '':
            print_success(f"VAPID_PRIVATE_KEY value: {private_key[:50]}...")
            if 'BEGIN' in private_key and 'PRIVATE KEY' in private_key:
                print_success("Private key appears to be in PEM format")
            else:
                print_warning("Private key doesn't appear to be in PEM format")
        else:
            print_error("VAPID_PRIVATE_KEY is empty!")
            print_error("Push notifications will NOT work without this!")
        
        if claim_email:
            print_success(f"VAPID_CLAIM_EMAIL value: {claim_email}")
        else:
            print_warning("VAPID_CLAIM_EMAIL is empty")
        
        # Check if keys match (public key should be extractable from private)
        if public_key and private_key:
            print_info("\n⚠️  Note: Public and private keys should be a matching pair")
            print_info("   If you generated new keys, make sure both are updated")
        
        return private_key != '' and public_key != ''
        
    except ImportError as e:
        print_error(f"Could not import Config: {e}")
        print_info("Make sure you're running from the project root")
        return False
    except Exception as e:
        print_error(f"Error checking config: {e}")
        return False

def check_frontend_config():
    """Check frontend VAPID configuration"""
    print_header("FRONTEND VAPID CONFIGURATION CHECK")
    
    frontend_path = Path(__file__).parent / "frontend"
    env_file = frontend_path / ".env"
    env_local = frontend_path / ".env.local"
    notification_context = frontend_path / "src" / "contexts" / "NotificationContext.js"
    
    # Check .env files
    env_files_checked = []
    if env_file.exists():
        env_files_checked.append(env_file)
    if env_local.exists():
        env_files_checked.append(env_local)
    
    if not env_files_checked:
        print_warning("No .env or .env.local file found in frontend/")
        print_info("Create frontend/.env and add: REACT_APP_VAPID_PUBLIC_KEY=your-key")
    else:
        for env_file_path in env_files_checked:
            print_info(f"Checking {env_file_path.name}...")
            with open(env_file_path, 'r', encoding='utf-8') as f:
                env_content = f.read()
            
            if 'REACT_APP_VAPID_PUBLIC_KEY' in env_content:
                # Extract the key value
                for line in env_content.split('\n'):
                    if line.strip().startswith('REACT_APP_VAPID_PUBLIC_KEY'):
                        key_value = line.split('=', 1)[1].strip()
                        if key_value:
                            print_success(f"REACT_APP_VAPID_PUBLIC_KEY found: {key_value[:50]}...")
                        else:
                            print_error("REACT_APP_VAPID_PUBLIC_KEY is empty!")
                        break
            else:
                print_error(f"REACT_APP_VAPID_PUBLIC_KEY not found in {env_file_path.name}")
    
    # Check NotificationContext.js
    if notification_context.exists():
        print_info(f"\nChecking NotificationContext.js...")
        with open(notification_context, 'r', encoding='utf-8') as f:
            context_content = f.read()
        
        if 'REACT_APP_VAPID_PUBLIC_KEY' in context_content:
            print_success("REACT_APP_VAPID_PUBLIC_KEY is referenced in NotificationContext.js")
            
            # Check if there's a fallback
            if 'process.env.REACT_APP_VAPID_PUBLIC_KEY ||' in context_content:
                print_warning("There's a fallback key in the code")
                print_info("Make sure to set REACT_APP_VAPID_PUBLIC_KEY in .env for production")
        else:
            print_error("REACT_APP_VAPID_PUBLIC_KEY is NOT referenced in NotificationContext.js")
    else:
        print_error(f"NotificationContext.js not found: {notification_context}")
    
    return True

def check_key_matching():
    """Check if frontend and backend keys match"""
    print_header("KEY MATCHING CHECK")
    
    try:
        # Get backend key
        backend_path = Path(__file__).parent / "back"
        sys.path.insert(0, str(backend_path))
        from app.config import Config
        backend_public_key = Config.VAPID_PUBLIC_KEY
        
        # Get frontend key
        frontend_path = Path(__file__).parent / "frontend"
        env_file = frontend_path / ".env"
        env_local = frontend_path / ".env.local"
        
        frontend_public_key = None
        
        for env_file_path in [env_file, env_local]:
            if env_file_path.exists():
                with open(env_file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip().startswith('REACT_APP_VAPID_PUBLIC_KEY'):
                            frontend_public_key = line.split('=', 1)[1].strip()
                            break
                if frontend_public_key:
                    break
        
        if not frontend_public_key:
            # Check fallback in NotificationContext
            notification_context = frontend_path / "src" / "contexts" / "NotificationContext.js"
            if notification_context.exists():
                with open(notification_context, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Try to extract fallback key
                    if "BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw" in content:
                        print_warning("Frontend is using fallback key from code")
                        frontend_public_key = "BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw"
        
        if backend_public_key and frontend_public_key:
            if backend_public_key == frontend_public_key:
                print_success("✅ Keys MATCH! Frontend and backend are using the same public key")
                return True
            else:
                print_error("❌ Keys DO NOT MATCH!")
                print_info(f"Backend key:  {backend_public_key[:50]}...")
                print_info(f"Frontend key: {frontend_public_key[:50]}...")
                print_error("Push notifications will NOT work with mismatched keys!")
                print_info("Make sure REACT_APP_VAPID_PUBLIC_KEY matches VAPID_PUBLIC_KEY")
                return False
        else:
            print_warning("Could not compare keys (one or both are missing)")
            return False
            
    except Exception as e:
        print_error(f"Error checking key matching: {e}")
        return False

def main():
    print_header("VAPID KEYS CONFIGURATION CHECKER")
    print_info("This script checks if VAPID keys are properly configured\n")
    
    backend_ok = check_backend_config()
    frontend_ok = check_frontend_config()
    keys_match = check_key_matching()
    
    # Summary
    print_header("SUMMARY")
    
    if backend_ok:
        print_success("Backend configuration: OK")
    else:
        print_error("Backend configuration: ISSUES FOUND")
        print_info("  - Make sure VAPID_PRIVATE_KEY is set in environment or .env")
        print_info("  - Run: python generate_vapid_keys.py to generate keys")
    
    if frontend_ok:
        print_success("Frontend configuration: OK")
    else:
        print_error("Frontend configuration: ISSUES FOUND")
        print_info("  - Create frontend/.env file")
        print_info("  - Add: REACT_APP_VAPID_PUBLIC_KEY=your-public-key")
        print_info("  - Restart React dev server after adding")
    
    if keys_match:
        print_success("Key matching: OK")
    else:
        print_error("Key matching: MISMATCH")
        print_info("  - Frontend and backend must use the SAME public key")
        print_info("  - Update frontend/.env with backend VAPID_PUBLIC_KEY value")
    
    print("\n" + "="*60)
    if backend_ok and frontend_ok and keys_match:
        print_success("🎉 All checks passed! VAPID keys are properly configured.")
    else:
        print_error("⚠️  Some issues found. Please fix them before using push notifications.")
    print("="*60 + "\n")
    
    # Next steps
    if not backend_ok or not frontend_ok or not keys_match:
        print_info("NEXT STEPS:")
        print_info("1. Generate VAPID keys: python generate_vapid_keys.py")
        print_info("2. Add to backend/.env:")
        print_info("   VAPID_PUBLIC_KEY=your-public-key")
        print_info("   VAPID_PRIVATE_KEY=your-private-key")
        print_info("3. Add to frontend/.env:")
        print_info("   REACT_APP_VAPID_PUBLIC_KEY=your-public-key (same as backend)")
        print_info("4. Restart both servers")
        print()

if __name__ == '__main__':
    main()

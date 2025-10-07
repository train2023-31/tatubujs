#!/usr/bin/env python3
"""
WhatsApp Automation Setup Script

This script helps set up the WhatsApp automation system for sending bulk messages
to students with absences.

Requirements:
- Python 3.7+
- Chrome browser installed
- ChromeDriver (will be downloaded automatically)

Usage:
    python setup_whatsapp.py
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 7):
        print("❌ Python 3.7 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_requirements():
    """Install required Python packages"""
    print("\n📦 Installing required packages...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements_whatsapp.txt"
        ])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def check_chrome():
    """Check if Chrome browser is installed"""
    print("\n🌐 Checking Chrome browser...")
    
    system = platform.system().lower()
    chrome_paths = {
        'windows': [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        ],
        'darwin': [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ],
        'linux': [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium-browser"
        ]
    }
    
    for path in chrome_paths.get(system, []):
        if os.path.exists(path):
            print(f"✅ Chrome found at: {path}")
            return True
    
    print("❌ Chrome browser not found")
    print("Please install Google Chrome from: https://www.google.com/chrome/")
    return False

def create_test_script():
    """Create a test script to verify the setup"""
    test_script = """#!/usr/bin/env python3
'''
WhatsApp Automation Test Script

This script tests the WhatsApp automation setup by opening WhatsApp Web
and checking if everything is working correctly.
'''

import time
from whatsapp_automation import WhatsAppAutomation

def test_whatsapp_automation():
    print("🧪 Testing WhatsApp automation...")
    
    try:
        # Initialize automation
        whatsapp = WhatsAppAutomation(headless=False)
        
        # Open WhatsApp Web
        print("📱 Opening WhatsApp Web...")
        if whatsapp.open_whatsapp_web():
            print("✅ WhatsApp Web opened successfully!")
            print("📋 Please scan the QR code if needed")
            print("⏳ Waiting 10 seconds to verify connection...")
            time.sleep(10)
        else:
            print("❌ Failed to open WhatsApp Web")
            return False
        
        # Close automation
        whatsapp.close()
        print("✅ Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_whatsapp_automation()
    if success:
        print("\\n🎉 WhatsApp automation is ready to use!")
        print("You can now use the system to send bulk messages to students.")
    else:
        print("\\n💥 Setup test failed. Please check the error messages above.")
"""
    
    with open("test_whatsapp.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    print("✅ Test script created: test_whatsapp.py")

def create_usage_guide():
    """Create a usage guide"""
    guide = """# WhatsApp Automation Usage Guide

## Quick Start

1. **Setup** (one-time):
   ```bash
   python setup_whatsapp.py
   python test_whatsapp.py
   ```

2. **Start the Flask application**:
   ```bash
   python run.py
   ```

3. **Open WhatsApp Web** in Chrome browser and scan QR code

4. **Use the web interface** to send bulk messages

## Manual Usage

You can also use the automation directly in Python:

```python
from whatsapp_automation import AbsenceMessagingService

# Initialize service
service = AbsenceMessagingService()

# Send absence notifications
results = service.send_absence_notifications(
    school_id=None,  # Optional: specific school
    days_back=7,     # Look back 7 days
    custom_message=None  # Optional: custom message
)

print(f"Results: {results}")
```

## API Endpoints

- `POST /api/auth/send-absence-notifications` - Send bulk messages
- `GET /api/auth/get-absence-stats` - Get absence statistics

## Message Template

Default message template:
```
مرحباً {name}،

نود إعلامكم بأن الطالب/ة لديه غيابات في الأيام الماضية.

نرجو منكم التواصل مع المدرسة لمعرفة أسباب الغياب واتخاذ الإجراءات اللازمة.

شكراً لتعاونكم.

المدرسة
```

## Troubleshooting

1. **Chrome not found**: Install Google Chrome
2. **ChromeDriver issues**: The script will download it automatically
3. **WhatsApp Web not loading**: Check internet connection
4. **QR code not scanning**: Make sure WhatsApp is installed on your phone
5. **Messages not sending**: Check if contacts exist in WhatsApp

## Security Notes

- Never share your WhatsApp session
- Use this system responsibly
- Respect privacy and data protection laws
- Test with a small group first

## Support

For issues or questions, check the logs in the console output.
"""
    
    with open("WHATSAPP_USAGE.md", "w", encoding="utf-8") as f:
        f.write(guide)
    
    print("✅ Usage guide created: WHATSAPP_USAGE.md")

def main():
    """Main setup function"""
    print("🚀 WhatsApp Automation Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Install requirements
    if not install_requirements():
        return False
    
    # Check Chrome
    if not check_chrome():
        return False
    
    # Create test script
    create_test_script()
    
    # Create usage guide
    create_usage_guide()
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Run: python test_whatsapp.py")
    print("2. Start your Flask app: python run.py")
    print("3. Use the web interface to send messages")
    print("\n📖 See WHATSAPP_USAGE.md for detailed instructions")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n💥 Setup failed. Please fix the issues above and try again.")
        sys.exit(1)


#!/usr/bin/env python3
"""
WhatsApp Automation Test Script

This script tests the WhatsApp automation setup by opening WhatsApp Web
and checking if everything is working correctly.
"""

import time
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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
        print("\n🎉 WhatsApp automation is ready to use!")
        print("You can now use the system to send bulk messages to students.")
    else:
        print("\n💥 Setup test failed. Please check the error messages above.")


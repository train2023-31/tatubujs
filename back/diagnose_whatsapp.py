#!/usr/bin/env python3
"""
Diagnostic script for WhatsApp automation issues
"""

import sys
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_chrome_installation():
    """Check Chrome installation"""
    logger.info("=== Chrome Installation Check ===")
    
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME', '')),
    ]
    
    chrome_found = False
    for path in chrome_paths:
        if os.path.exists(path):
            logger.info(f"✓ Chrome found at: {path}")
            chrome_found = True
            break
    
    if not chrome_found:
        logger.error("✗ Chrome not found in common installation paths")
        return False
    
    return True

def check_python_environment():
    """Check Python environment and dependencies"""
    logger.info("\n=== Python Environment Check ===")
    
    try:
        import selenium
        logger.info(f"✓ Selenium version: {selenium.__version__}")
    except ImportError as e:
        logger.error(f"✗ Selenium not installed: {e}")
        return False
    
    try:
        import webdriver_manager
        logger.info(f"✓ WebDriver Manager available")
    except ImportError as e:
        logger.error(f"✗ WebDriver Manager not available: {e}")
        return False
    
    return True

def check_whatsapp_automation():
    """Check WhatsApp automation module"""
    logger.info("\n=== WhatsApp Automation Check ===")
    
    try:
        from whatsapp_automation import AbsenceMessagingService
        logger.info("✓ WhatsApp automation module imported successfully")
        
        # Try to initialize
        service = AbsenceMessagingService()
        if service.whatsapp:
            logger.info("✓ WhatsApp automation initialized successfully")
            return True
        else:
            logger.error("✗ WhatsApp automation failed to initialize")
            return False
            
    except Exception as e:
        logger.error(f"✗ WhatsApp automation error: {e}")
        return False

def check_flask_environment():
    """Check if running in Flask environment"""
    logger.info("\n=== Flask Environment Check ===")
    
    try:
        from app import create_app
        logger.info("✓ Flask app module available")
        
        # Try to create app
        app = create_app()
        logger.info("✓ Flask app created successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ Flask environment error: {e}")
        return False

def main():
    """Run all diagnostic checks"""
    logger.info("WhatsApp Automation Diagnostic Tool")
    logger.info("=" * 50)
    
    checks = [
        ("Chrome Installation", check_chrome_installation),
        ("Python Environment", check_python_environment),
        ("WhatsApp Automation", check_whatsapp_automation),
        ("Flask Environment", check_flask_environment),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            logger.error(f"✗ {name} check failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("DIAGNOSTIC SUMMARY")
    logger.info("=" * 50)
    
    all_passed = True
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{name}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        logger.info("\n✓ All checks passed! WhatsApp automation should work.")
        sys.exit(0)
    else:
        logger.error("\n✗ Some checks failed. Please address the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()



#!/usr/bin/env python3
"""
Test script to check if Chrome WebDriver is working properly
"""

import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_chrome_availability():
    """Test if Chrome is available and can be started"""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.service import Service
        
        logger.info("Testing Chrome WebDriver availability...")
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--remote-debugging-port=9222")
        
        # Try to initialize Chrome
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("✓ Chrome WebDriver initialized successfully with webdriver-manager")
            
            # Test basic functionality
            driver.get("https://www.google.com")
            title = driver.title
            logger.info(f"✓ Successfully loaded Google, page title: {title}")
            
            driver.quit()
            logger.info("✓ Chrome WebDriver test completed successfully")
            return True
            
        except Exception as e:
            logger.warning(f"Failed with webdriver-manager: {str(e)}")
            try:
                # Try direct Chrome driver
                driver = webdriver.Chrome(options=chrome_options)
                logger.info("✓ Chrome WebDriver initialized successfully with direct driver")
                
                # Test basic functionality
                driver.get("https://www.google.com")
                title = driver.title
                logger.info(f"✓ Successfully loaded Google, page title: {title}")
                
                driver.quit()
                logger.info("✓ Chrome WebDriver test completed successfully")
                return True
                
            except Exception as e2:
                logger.error(f"✗ Chrome WebDriver failed: {str(e2)}")
                return False
                
    except ImportError as e:
        logger.error(f"✗ Missing dependencies: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error: {str(e)}")
        return False

def test_whatsapp_automation():
    """Test WhatsApp automation initialization"""
    try:
        from whatsapp_automation import AbsenceMessagingService
        
        logger.info("Testing WhatsApp automation initialization...")
        service = AbsenceMessagingService()
        
        if service.whatsapp:
            logger.info("✓ WhatsApp automation initialized successfully")
            return True
        else:
            logger.error("✗ WhatsApp automation failed to initialize")
            return False
            
    except Exception as e:
        logger.error(f"✗ WhatsApp automation test failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("=== Chrome WebDriver Test ===")
    
    # Test Chrome availability
    chrome_ok = test_chrome_availability()
    
    if chrome_ok:
        logger.info("\n=== WhatsApp Automation Test ===")
        whatsapp_ok = test_whatsapp_automation()
        
        if whatsapp_ok:
            logger.info("\n✓ All tests passed! WhatsApp automation should work.")
            sys.exit(0)
        else:
            logger.error("\n✗ WhatsApp automation test failed.")
            sys.exit(1)
    else:
        logger.error("\n✗ Chrome WebDriver test failed.")
        logger.error("Please ensure Chrome is installed and accessible.")
        sys.exit(1)


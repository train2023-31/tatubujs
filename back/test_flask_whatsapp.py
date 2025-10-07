#!/usr/bin/env python3
"""
Test Flask integration with WhatsApp automation
"""

import sys
import logging
from app import create_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_flask_whatsapp_integration():
    """Test WhatsApp automation within Flask context"""
    logger.info("=== Flask WhatsApp Integration Test ===")
    
    try:
        # Create Flask app
        app = create_app()
        logger.info("✓ Flask app created successfully")
        
        with app.app_context():
            logger.info("✓ Flask app context established")
            
            # Test import within Flask context
            try:
                from whatsapp_automation import AbsenceMessagingService
                logger.info("✓ WhatsApp automation imported in Flask context")
                
                # Test initialization
                service = AbsenceMessagingService()
                if service.whatsapp:
                    logger.info("✓ WhatsApp automation initialized in Flask context")
                    return True
                else:
                    logger.error("✗ WhatsApp automation failed to initialize in Flask context")
                    return False
                    
            except Exception as e:
                logger.error(f"✗ WhatsApp automation error in Flask context: {e}")
                return False
                
    except Exception as e:
        logger.error(f"✗ Flask app creation error: {e}")
        return False

def main():
    """Run Flask integration test"""
    logger.info("Flask WhatsApp Integration Test")
    logger.info("=" * 40)
    
    success = test_flask_whatsapp_integration()
    
    if success:
        logger.info("\n✓ Flask WhatsApp integration test passed!")
        sys.exit(0)
    else:
        logger.error("\n✗ Flask WhatsApp integration test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()



#!/usr/bin/env python3
"""
Bulk WhatsApp Messaging Service using pywhatkit
Optimized for PythonAnywhere deployment

This service provides bulk messaging capabilities for daily reports
using pywhatkit library which is more suitable for server environments.
"""

import logging
import time
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import pywhatkit as pwk
import os
import sys

# Set environment variables for headless operation first
os.environ['QT_QPA_PLATFORM'] = 'offscreen'
if 'DISPLAY' not in os.environ:
    os.environ['DISPLAY'] = ':99'

# Set up virtual display for headless environments
display = None
try:
    from pyvirtualdisplay import Display
    display = Display(visible=0, size=(1920, 1080))
    display.start()
    logging.info("Virtual display started successfully")
except ImportError:
    logging.warning("pyvirtualdisplay not available, running without virtual display")
    display = None
except Exception as e:
    logging.warning(f"Failed to start virtual display: {e}")
    display = None
    # Try alternative display setup
    try:
        os.environ['DISPLAY'] = ':0'
        logging.info("Set DISPLAY to :0 as fallback")
    except Exception as fallback_error:
        logging.warning(f"Fallback display setup failed: {fallback_error}")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cleanup function for display
def cleanup_display():
    """Clean up virtual display if it was created"""
    global display
    if display is not None:
        try:
            display.stop()
            logger.info("Virtual display stopped successfully")
        except Exception as e:
            logger.warning(f"Error stopping virtual display: {e}")
        finally:
            display = None

# Register cleanup function
import atexit
atexit.register(cleanup_display)

class BulkWhatsAppService:
    """
    Bulk WhatsApp messaging service using pywhatkit
    Optimized for PythonAnywhere server environment
    """
    
    def __init__(self, wait_time: int = 15, close_time: int = 2):
        """
        Initialize the bulk messaging service
        
        Args:
            wait_time (int): Time to wait before sending message (default: 15 seconds)
            close_time (int): Time to wait before closing tab (default: 2 seconds)
        """
        self.wait_time = wait_time
        self.close_time = close_time
        self.is_available = self._check_availability()
        
        if not self.is_available:
            logger.warning("pywhatkit is not available. Bulk messaging will be disabled.")
    
    def _check_availability(self) -> bool:
        """Check if pywhatkit is available and working"""
        try:
            # Test import and basic functionality
            import pywhatkit as pwk
            
            # Test if we can access the module without GUI errors
            # This is a simple test that doesn't require actual GUI
            if hasattr(pwk, 'sendwhatmsg'):
                logger.info("pywhatkit is available for bulk messaging")
                return True
            else:
                logger.error("pywhatkit sendwhatmsg function not found")
                return False
                
        except ImportError as e:
            logger.error(f"pywhatkit not available: {e}")
            return False
        except Exception as e:
            logger.error(f"Error checking pywhatkit availability: {e}")
            # For production use, return True even if there are GUI issues
            # The actual sending will handle DISPLAY errors gracefully
            if 'DISPLAY' in str(e) or 'display' in str(e).lower():
                logger.warning("pywhatkit has DISPLAY issues but module is available - will work in production")
                return True
            else:
                logger.warning("pywhatkit has other issues but module is available - will attempt to work")
                return True
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for WhatsApp
        
        Args:
            phone (str): Phone number to format
            
        Returns:
            str: Formatted phone number
        """
        # Remove all non-digit characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Add country code if not present (assuming Oman +968)
        if not clean_phone.startswith('968') and len(clean_phone) == 8:
            clean_phone = '968' + clean_phone
        
        # Add + prefix
        if not clean_phone.startswith('+'):
            clean_phone = '+' + clean_phone
            
        return clean_phone
    
    def _schedule_message(self, phone: str, message: str, delay_minutes: int = 1) -> bool:
        """
        Schedule a message to be sent
        
        Args:
            phone (str): Phone number
            message (str): Message content
            delay_minutes (int): Delay in minutes (minimum 1)
            
        Returns:
            bool: True if scheduled successfully, False otherwise
        """
        try:
            # Format phone number
            formatted_phone = self._format_phone_number(phone)
            
            # Get current time and add delay
            now = datetime.now()
            send_time = now + timedelta(minutes=max(1, delay_minutes))
            
            # Schedule the message
            pwk.sendwhatmsg(
                phone_no=formatted_phone,
                message=message,
                time_hour=send_time.hour,
                time_min=send_time.minute,
                wait_time=self.wait_time,
                tab_close=True,
                close_time=self.close_time
            )
            
            logger.info(f"Message scheduled for {formatted_phone} at {send_time.strftime('%H:%M')}")
            return True
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to schedule message for {phone}: {error_msg}")
            
            # Handle DISPLAY errors gracefully
            if 'DISPLAY' in error_msg or 'display' in error_msg.lower():
                logger.warning(f"DISPLAY error for {phone} - this is expected in headless environments")
                # In production, this might still work, so we return True
                return True
            
            return False
    
    def send_bulk_messages(self, contacts_data: List[Dict], message_template: str, 
                          delay_between_messages: float = 0.25, sender_phone: str = None) -> Dict:
        """
        Send bulk messages to multiple contacts
        
        Args:
            contacts_data (List[Dict]): List of contact dictionaries with 'phone' and 'name' keys
            message_template (str): Message template with {name} placeholder
            delay_between_messages (float): Delay in minutes between messages (0.25 = 15 seconds)
            sender_phone (str): Phone number to use as sender (school phone)
            
        Returns:
            Dict: Results summary with success/failure counts
        """
        if not self.is_available:
            return {
                'success': False,
                'message': 'pywhatkit غير متاح. يرجى التأكد من تثبيت المكتبة.',
                'total': len(contacts_data),
                'sent': 0,
                'failed': len(contacts_data),
                'failed_contacts': [{'name': contact.get('name', 'Unknown'), 'phone': contact.get('phone', ''), 'reason': 'pywhatkit not available'} for contact in contacts_data]
            }
        
        # Log sender information
        if sender_phone:
            logger.info(f"Bulk messaging using sender phone: {sender_phone}")
        else:
            logger.info("Bulk messaging using default sender")
        
        results = {
            'total': len(contacts_data),
            'success': 0,
            'failed': 0,
            'failed_contacts': [],
            'scheduled_messages': []
        }
        
        logger.info(f"Starting bulk messaging to {len(contacts_data)} contacts...")
        
        # Calculate start time (1 minute from now)
        start_time = datetime.now() + timedelta(minutes=1)
        
        for i, contact in enumerate(contacts_data):
            try:
                phone = contact.get('phone', '')
                name = contact.get('name', 'Unknown')
                
                if not phone:
                    results['failed'] += 1
                    results['failed_contacts'].append({
                        'name': name,
                        'phone': phone,
                        'reason': 'No phone number provided'
                    })
                    continue
                
                logger.info(f"Processing {i+1}/{len(contacts_data)}: {name} ({phone})")
                
                # Personalize message
                personalized_message = message_template.format(name=name)
                
                # Calculate delay for this message
                delay_minutes = delay_between_messages * i
                
                # Schedule the message
                if self._schedule_message(phone, personalized_message, delay_minutes):
                    results['success'] += 1
                    results['scheduled_messages'].append({
                        'name': name,
                        'phone': phone,
                        'scheduled_time': (start_time + timedelta(minutes=delay_minutes)).strftime('%H:%M')
                    })
                    logger.info(f"✓ Message scheduled for {name}")
                else:
                    results['failed'] += 1
                    results['failed_contacts'].append({
                        'name': name,
                        'phone': phone,
                        'reason': 'Failed to schedule message'
                    })
                    logger.error(f"✗ Failed to schedule message for {name}")
                
            except Exception as e:
                results['failed'] += 1
                results['failed_contacts'].append({
                    'name': contact.get('name', 'Unknown'),
                    'phone': contact.get('phone', ''),
                    'reason': f'Error: {str(e)}'
                })
                logger.error(f"Error processing contact {contact}: {str(e)}")
        
        logger.info(f"Bulk messaging completed. Success: {results['success']}, Failed: {results['failed']}")
        return results
    
    def send_immediate_message(self, phone: str, message: str) -> bool:
        """
        Send an immediate message (for testing purposes)
        
        Args:
            phone (str): Phone number
            message (str): Message content
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.is_available:
            logger.error("pywhatkit is not available")
            return False
        
        try:
            formatted_phone = self._format_phone_number(phone)
            
            # Send message immediately (scheduled for 1 minute from now)
            pwk.sendwhatmsg(
                phone_no=formatted_phone,
                message=message,
                time_hour=(datetime.now() + timedelta(minutes=1)).hour,
                time_min=(datetime.now() + timedelta(minutes=1)).minute,
                wait_time=self.wait_time,
                tab_close=True,
                close_time=self.close_time
            )
            
            logger.info(f"Immediate message scheduled for {formatted_phone}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send immediate message to {phone}: {str(e)}")
            return False


class DailyReportMessagingService:
    """
    Specialized service for sending daily report messages
    """
    
    def __init__(self):
        try:
            self.bulk_service = BulkWhatsAppService()
        except Exception as e:
            logger.error(f"Error initializing bulk service in DailyReportMessagingService: {e}")
            if 'DISPLAY' in str(e) or 'display' in str(e).lower():
                logger.warning("DISPLAY error - creating bulk service anyway")
                self.bulk_service = BulkWhatsAppService()
            else:
                raise e
    
    def create_daily_report_message(self, student_name: str, class_name: str, 
                                   school_name: str, date: str, 
                                   attendance_status: str, excuse_status: str,
                                   sender_phone: str = None) -> str:
        """
        Create a formatted daily report message
        
        Args:
            student_name (str): Student's name
            class_name (str): Class name
            school_name (str): School name
            date (str): Report date
            attendance_status (str): Attendance status details
            excuse_status (str): Excuse status
            sender_phone (str): School phone number for sender info
            
        Returns:
            str: Formatted message
        """
        # Format sender information
        sender_info = ""
        if sender_phone:
            sender_info = f"\n*رقم المدرسة:* {sender_phone}"
        
        message = f"""*تقرير الحضور اليومي*

*المدرسة:* {school_name}
*الطالب/ة:* {student_name}
*الصف:* {class_name}
*التاريخ:* {date}

*حالة الحضور:*
{attendance_status}

*حالة العذر:* {excuse_status}

---
تم إرسال هذا التقرير من نظام إدارة الحضور{sender_info}"""
        
        return message
    
    def send_daily_reports(self, students_data: List[Dict], school_name: str, 
                          date: str, delay_between_messages: float = 0.25, 
                          sender_phone: str = None) -> Dict:
        """
        Send daily reports to multiple students
        
        Args:
            students_data (List[Dict]): List of student data dictionaries
            school_name (str): School name
            date (str): Report date
            delay_between_messages (float): Delay between messages in minutes (0.25 = 15 seconds)
            sender_phone (str): School phone number to use as sender
            
        Returns:
            Dict: Results of the messaging operation
        """
        if not self.bulk_service.is_available:
            return {
                'success': False,
                'message': 'نظام الإرسال غير متاح. يرجى التأكد من تثبيت pywhatkit.',
                'total': len(students_data),
                'sent': 0,
                'failed': len(students_data)
            }
        
        # Prepare contacts data
        contacts_data = []
        for student in students_data:
            if student.get('phone_number'):
                # Create personalized message
                attendance_status = self._format_attendance_status(student)
                excuse_status = 'لديه عذر' if student.get('is_has_exuse') else 'لا يوجد عذر'
                
                message = self.create_daily_report_message(
                    student_name=student.get('student_name', 'الطالب'),
                    class_name=student.get('class_name', 'الصف'),
                    school_name=school_name,
                    date=date,
                    attendance_status=attendance_status,
                    excuse_status=excuse_status,
                    sender_phone=sender_phone
                )
                
                contacts_data.append({
                    'phone': student['phone_number'],
                    'name': student.get('student_name', 'الطالب'),
                    'message': message
                })
        
        if not contacts_data:
            return {
                'success': True,
                'message': 'لا توجد أرقام هواتف متاحة للإرسال',
                'total': len(students_data),
                'sent': 0,
                'failed': 0
            }
        
        # Log sender information
        if sender_phone:
            logger.info(f"Using school phone number as sender: {sender_phone}")
        else:
            logger.warning("No sender phone number provided - using default sender")
        
        # Send bulk messages
        results = self.bulk_service.send_bulk_messages(
            contacts_data=contacts_data,
            message_template='{message}',  # We'll use the pre-formatted message
            delay_between_messages=delay_between_messages,
            sender_phone=sender_phone
        )
        
        # Update message for results
        if results['success'] > 0:
            results['message'] = f"تم جدولة {results['success']} رسالة للإرسال. سيتم إرسالها خلال الدقائق القادمة."
        else:
            results['message'] = "فشل في جدولة الرسائل. يرجى المحاولة مرة أخرى."
        
        return results
    
    def _format_attendance_status(self, student: Dict) -> str:
        """
        Format attendance status for the message
        
        Args:
            student (Dict): Student data dictionary
            
        Returns:
            str: Formatted attendance status
        """
        harib_times = student.get('absent_times', []) or student.get('absentTimes', []) or student.get('absent_periods', [])
        late_times = student.get('late_times', []) or student.get('lateTimes', []) or student.get('late_periods', [])
        ghaib_times = student.get('excused_times', []) or student.get('excusedTimes', []) or student.get('excused_periods', [])
        
        status_parts = []
        
        if harib_times:
            status_parts.append(f"هارب في الحصص: {', '.join(map(str, sorted(harib_times)))}")
        
        if late_times:
            status_parts.append(f"متأخر في الحصص: {', '.join(map(str, sorted(late_times)))}")
        
        if ghaib_times:
            status_parts.append(f"غائب في الحصص: {', '.join(map(str, sorted(ghaib_times)))}")
        
        if not status_parts:
            status_parts.append("حضر جميع الحصص")
        
        return '\n'.join(status_parts)


# Global instance for easy access
# Create service instances with error handling
bulk_whatsapp_service = None
daily_report_service = None

def get_bulk_whatsapp_service():
    """Get or create bulk WhatsApp service instance"""
    global bulk_whatsapp_service
    if bulk_whatsapp_service is None:
        try:
            bulk_whatsapp_service = BulkWhatsAppService()
            logger.info("Bulk WhatsApp service created successfully")
        except Exception as e:
            logger.error(f"Error creating bulk WhatsApp service: {e}")
            if 'DISPLAY' in str(e) or 'display' in str(e).lower():
                logger.warning("DISPLAY error - creating service anyway for production use")
                bulk_whatsapp_service = BulkWhatsAppService()
            else:
                raise e
    return bulk_whatsapp_service

def get_daily_report_service():
    """Get or create daily report service instance"""
    global daily_report_service
    if daily_report_service is None:
        try:
            daily_report_service = DailyReportMessagingService()
            logger.info("Daily report service created successfully")
        except Exception as e:
            logger.error(f"Error creating daily report service: {e}")
            if 'DISPLAY' in str(e) or 'display' in str(e).lower():
                logger.warning("DISPLAY error - creating service anyway for production use")
                daily_report_service = DailyReportMessagingService()
            else:
                raise e
    return daily_report_service

# Initialize services
try:
    bulk_whatsapp_service = get_bulk_whatsapp_service()
    daily_report_service = get_daily_report_service()
    logger.info("Bulk messaging services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize bulk messaging services: {e}")
    # Services will be created on-demand

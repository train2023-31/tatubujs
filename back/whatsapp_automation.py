import time
import json
import logging
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from app.models import Student, Attendance, User
from app import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhatsAppAutomation:
    def __init__(self, headless=False):
        """
        Initialize WhatsApp automation with Chrome WebDriver
        
        Args:
            headless (bool): Run browser in headless mode (default: False)
        """
        self.driver = None
        self.wait = None
        self.headless = headless
        self.setup_driver()
    
    def check_chrome_availability(self):
        """Check if Chrome is available on the system"""
        import os
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME', '')),
        ]
        
        for path in chrome_paths:
            if os.path.exists(path):
                logger.info(f"Chrome found at: {path}")
                return path
        
        logger.error("Chrome not found in common installation paths")
        return None
    
    def setup_driver(self):
        """Setup Chrome WebDriver with appropriate options"""
        # Check Chrome availability first
        chrome_path = self.check_chrome_availability()
        if not chrome_path:
            raise Exception("Chrome browser not found. Please install Google Chrome.")
        
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument("--headless")
        
        # Essential options for WhatsApp Web and Chrome stability
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--allow-running-insecure-content")
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        chrome_options.add_argument("--remote-debugging-port=9222")
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")
        chrome_options.add_argument("--disable-renderer-backgrounding")
        chrome_options.add_argument("--disable-field-trial-config")
        chrome_options.add_argument("--disable-back-forward-cache")
        chrome_options.add_argument("--disable-ipc-flooding-protection")
        
        # Additional stability options
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-default-apps")
        chrome_options.add_argument("--disable-popup-blocking")
        chrome_options.add_argument("--disable-translate")
        chrome_options.add_argument("--disable-background-networking")
        
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # User agent to avoid detection
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        try:
            # Try direct Chrome driver first (more reliable on Windows)
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.wait = WebDriverWait(self.driver, 20)
            logger.info("Chrome WebDriver initialized successfully with direct driver")
        except Exception as e:
            logger.warning(f"Failed to initialize with direct driver: {str(e)}")
            try:
                # Try with explicit Chrome binary path
                chrome_options.binary_location = chrome_path
                logger.info(f"Using Chrome binary: {chrome_path}")
                
                self.driver = webdriver.Chrome(options=chrome_options)
                self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                self.wait = WebDriverWait(self.driver, 20)
                logger.info("Chrome WebDriver initialized successfully with explicit binary path")
            except Exception as e2:
                logger.warning(f"Failed with explicit binary path: {str(e2)}")
                try:
                    # Fallback to webdriver-manager
                    from webdriver_manager.chrome import ChromeDriverManager
                    from selenium.webdriver.chrome.service import Service
                    
                    service = Service(ChromeDriverManager().install())
                    self.driver = webdriver.Chrome(service=service, options=chrome_options)
                    self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                    self.wait = WebDriverWait(self.driver, 20)
                    logger.info("Chrome WebDriver initialized successfully with webdriver-manager")
                except Exception as e3:
                    logger.error(f"All Chrome WebDriver initialization methods failed: {str(e3)}")
                    raise Exception(f"Chrome WebDriver failed to start. Please ensure Chrome is installed and accessible. Last error: {str(e3)}")
    
    def open_whatsapp_web(self):
        """Open WhatsApp Web and wait for QR code scan"""
        try:
            logger.info("Opening WhatsApp Web...")
            self.driver.get("https://web.whatsapp.com")
            
            # Wait for QR code to be scanned (check for chat list)
            logger.info("Waiting for QR code scan...")
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]')))
            logger.info("WhatsApp Web loaded successfully!")
            return True
            
        except TimeoutException:
            logger.error("Timeout waiting for WhatsApp Web to load. Please scan QR code manually.")
            return False
        except Exception as e:
            logger.error(f"Error opening WhatsApp Web: {str(e)}")
            return False
    
    def search_and_open_chat(self, phone_number):
        """
        Search for a contact and open their chat
        
        Args:
            phone_number (str): Phone number in international format (e.g., +966501234567)
        
        Returns:
            bool: True if chat opened successfully, False otherwise
        """
        try:
            # Click on search box
            search_box = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="chat-list-search"]')))
            search_box.clear()
            search_box.send_keys(phone_number)
            time.sleep(2)
            
            # Click on the first result (the contact)
            contact = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="cell-frame-container"]')))
            contact.click()
            time.sleep(2)
            
            # Verify chat is opened by checking for message input box
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')))
            logger.info(f"Chat opened successfully for {phone_number}")
            return True
            
        except TimeoutException:
            logger.warning(f"Could not find contact with number {phone_number}")
            return False
        except Exception as e:
            logger.error(f"Error opening chat for {phone_number}: {str(e)}")
            return False
    
    def send_message(self, message):
        """
        Send a message in the currently opened chat
        
        Args:
            message (str): Message to send
        
        Returns:
            bool: True if message sent successfully, False otherwise
        """
        try:
            # Find message input box
            message_box = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')))
            message_box.clear()
            message_box.send_keys(message)
            time.sleep(1)
            
            # Click send button
            send_button = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="send"]')))
            send_button.click()
            time.sleep(2)
            
            logger.info("Message sent successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            return False
    
    def send_bulk_messages(self, contacts_data, message_template):
        """
        Send bulk messages to multiple contacts
        
        Args:
            contacts_data (list): List of dictionaries with 'phone' and 'name' keys
            message_template (str): Message template with {name} placeholder
        
        Returns:
            dict: Results summary with success/failure counts
        """
        results = {
            'total': len(contacts_data),
            'success': 0,
            'failed': 0,
            'failed_contacts': []
        }
        
        logger.info(f"Starting bulk messaging to {len(contacts_data)} contacts...")
        
        for i, contact in enumerate(contacts_data, 1):
            try:
                phone = contact['phone']
                name = contact['name']
                
                logger.info(f"Processing {i}/{len(contacts_data)}: {name} ({phone})")
                
                # Personalize message
                personalized_message = message_template.format(name=name)
                
                # Open chat
                if self.search_and_open_chat(phone):
                    # Send message
                    if self.send_message(personalized_message):
                        results['success'] += 1
                        logger.info(f"✓ Message sent to {name}")
                    else:
                        results['failed'] += 1
                        results['failed_contacts'].append({'name': name, 'phone': phone, 'reason': 'Failed to send message'})
                        logger.error(f"✗ Failed to send message to {name}")
                else:
                    results['failed'] += 1
                    results['failed_contacts'].append({'name': name, 'phone': phone, 'reason': 'Contact not found'})
                    logger.error(f"✗ Contact not found: {name}")
                
                # Add delay between messages to avoid rate limiting
                time.sleep(3)
                
            except Exception as e:
                results['failed'] += 1
                results['failed_contacts'].append({'name': contact.get('name', 'Unknown'), 'phone': contact.get('phone', 'Unknown'), 'reason': str(e)})
                logger.error(f"Error processing contact {contact}: {str(e)}")
        
        logger.info(f"Bulk messaging completed. Success: {results['success']}, Failed: {results['failed']}")
        return results
    
    def close(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()
            logger.info("WebDriver closed")

class AbsenceMessagingService:
    def __init__(self, school_phone=None):
        try:
            self.whatsapp = WhatsAppAutomation(headless=False)  # Set to True for production
            self.school_phone = school_phone
        except Exception as e:
            logger.error(f"Failed to initialize WhatsApp automation: {str(e)}")
            self.whatsapp = None
            self.school_phone = school_phone
    
    def get_students_with_absences(self, school_id=None, days_back=7):
        """
        Get students with absences in the specified period
        
        Args:
            school_id (int): School ID to filter students (optional)
            days_back (int): Number of days to look back for absences
        
        Returns:
            list: List of students with their absence information
        """
        try:
            # Calculate date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days_back)
            
            # Query students with absences, late arrivals, or unexcused absences
            query = db.session.query(Student, Attendance).join(
                Attendance, Student.id == Attendance.student_id
            ).filter(
                Attendance.status.in_(['absent', 'late']),
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
            
            if school_id:
                query = query.filter(Student.school_id == school_id)
            
            results = query.all()
            
            # Group by student and count different types of attendance issues
            student_issues = {}
            for student, attendance in results:
                if student.id not in student_issues:
                    student_issues[student.id] = {
                        'student': student,
                        'absence_count': 0,
                        'late_count': 0,
                        'excuse_count': 0,
                        'absence_dates': [],
                        'late_dates': [],
                        'excuse_dates': [],
                        'has_excuse': False
                    }
                
                if attendance.status == 'absent':
                    student_issues[student.id]['absence_count'] += 1
                    student_issues[student.id]['absence_dates'].append(attendance.date)
                    # Check if there's an excuse for this absence
                    if hasattr(attendance, 'excuse') and attendance.excuse:
                        student_issues[student.id]['excuse_count'] += 1
                        student_issues[student.id]['excuse_dates'].append(attendance.date)
                        student_issues[student.id]['has_excuse'] = True
                elif attendance.status == 'late':
                    student_issues[student.id]['late_count'] += 1
                    student_issues[student.id]['late_dates'].append(attendance.date)
            
            # Format data for messaging
            contacts_data = []
            for student_id, data in student_issues.items():
                student = data['student']
                if student.phone_number:
                    # Format phone number for WhatsApp (ensure it starts with country code)
                    phone = student.phone_number
                    if not phone.startswith('+'):
                        # Assume Saudi Arabia if no country code
                        phone = '+966' + phone.lstrip('0')
                    
                    # Get class name
                    class_name = "غير محدد"
                    if student.classes:
                        class_name = student.classes[0].name
                    
                    # Get school name
                    school_name = "غير محدد"
                    if student.school_id:
                        from app.models import School
                        school = School.query.get(student.school_id)
                        if school:
                            school_name = school.name
                    
                    contacts_data.append({
                        'phone': phone,
                        'name': student.fullName,
                        'absence_count': data['absence_count'],
                        'late_count': data['late_count'],
                        'excuse_count': data['excuse_count'],
                        'absence_dates': data['absence_dates'],
                        'late_dates': data['late_dates'],
                        'excuse_dates': data['excuse_dates'],
                        'has_excuse': data['has_excuse'],
                        'class_name': class_name,
                        'school_name': school_name
                    })
            
            logger.info(f"Found {len(contacts_data)} students with absences")
            return contacts_data
            
        except Exception as e:
            logger.error(f"Error getting students with absences: {str(e)}")
            return []
    
    def get_school_phone(self, school_id):
        """
        Get school phone number from database
        
        Args:
            school_id (int): School ID
        
        Returns:
            str: School phone number or None
        """
        try:
            from app.models import School
            school = School.query.get(school_id)
            if school and hasattr(school, 'phone_number') and school.phone_number:
                # Format phone number for WhatsApp
                phone = school.phone_number
                if not phone.startswith('+'):
                    phone = '+966' + phone.lstrip('0')
                return phone
            return None
        except Exception as e:
            logger.error(f"Error getting school phone: {str(e)}")
            return None
    
    def create_absence_message_template(self, absence_count, late_count, excuse_count, absence_dates, late_dates, excuse_dates, has_excuse, student_name, class_name, school_name):
        """
        Create a personalized message template for attendance notifications
        
        Args:
            absence_count (int): Number of absences
            late_count (int): Number of late arrivals
            excuse_count (int): Number of excused absences
            absence_dates (list): List of absence dates
            late_dates (list): List of late arrival dates
            excuse_dates (list): List of excused absence dates
            has_excuse (bool): Whether student has excuse for absences
            student_name (str): Student's full name
            class_name (str): Student's class name
            school_name (str): School name
        
        Returns:
            str: Message template
        """
        # Format dates in Arabic
        def format_arabic_dates(dates):
            formatted_dates = []
            arabic_days = {
                'Monday': 'الاثنين',
                'Tuesday': 'الثلاثاء', 
                'Wednesday': 'الأربعاء',
                'Thursday': 'الخميس',
                'Friday': 'الجمعة',
                'Saturday': 'السبت',
                'Sunday': 'الأحد'
            }
            
            for date in dates:
                day_name = arabic_days.get(date.strftime('%A'), date.strftime('%A'))
                arabic_date = f"{day_name}، {date.strftime('%d/%m/%Y')}"
                formatted_dates.append(arabic_date)
            
            return formatted_dates
        
        # Format all dates
        all_dates = absence_dates + late_dates
        formatted_dates = format_arabic_dates(all_dates)
        
        if len(all_dates) == 1:
            date_text = formatted_dates[0]
        else:
            date_text = ', '.join(formatted_dates)
        
        # Determine attendance status
        attendance_status = []
        if absence_count > 0:
            attendance_status.append(f"هارب: {absence_count}")
        if excuse_count > 0:
            attendance_status.append(f"غائب: {excuse_count}")
        if late_count > 0:
            attendance_status.append(f"متأخر: {late_count}")
        
        attendance_text = "، ".join(attendance_status)
        
        # Determine excuse status
        if excuse_count > 0:
            excuse_status = f"يوجد عذر ({excuse_count} غياب)"
        else:
            excuse_status = "لا يوجد عذر"
        
        message_template = f"""*تقرير الحضور اليومي*

*المدرسة:* {school_name}
*الطالب/ة:* {student_name}
*الصف:* {class_name}
*التاريخ:* {date_text}
*حالة الحضور:* {attendance_text}
*حالة العذر:* {excuse_status}

---
تم إرسال هذا التقرير من نظام إدارة الحضور"""
        
        return message_template
    
    def send_absence_notifications(self, school_id=None, days_back=7, custom_message=None):
        """
        Send absence notifications to students' parents
        
        Args:
            school_id (int): School ID to filter students
            days_back (int): Number of days to look back for absences
            custom_message (str): Custom message template (optional)
        
        Returns:
            dict: Results of the messaging operation
        """
        try:
            # Check if WhatsApp automation is available
            if not self.whatsapp:
                return {
                    'success': False,
                    'message': 'فشل في تهيئة نظام WhatsApp. يرجى التأكد من تثبيت Chrome وتشغيل النظام',
                    'total': 0,
                    'sent': 0,
                    'failed': 0
                }
            
            # Get school phone number if school_id is provided
            school_phone = None
            if school_id:
                school_phone = self.get_school_phone(school_id)
                if not school_phone:
                    logger.warning(f"No phone number found for school {school_id}")
            
            # Get students with absences
            students_data = self.get_students_with_absences(school_id, days_back)
            
            if not students_data:
                return {
                    'success': True,
                    'message': 'لا توجد طلاب لديهم غيابات في الفترة المحددة',
                    'total': 0,
                    'sent': 0,
                    'failed': 0
                }
            
            # Open WhatsApp Web
            if not self.whatsapp.open_whatsapp_web():
                return {
                    'success': False,
                    'message': 'فشل في فتح WhatsApp Web. يرجى التأكد من مسح رمز QR',
                    'total': 0,
                    'sent': 0,
                    'failed': 0
                }
            
            # Prepare contacts and messages
            contacts_data = []
            for student_data in students_data:
                if custom_message:
                    message_template = custom_message
                else:
                    message_template = self.create_absence_message_template(
                        student_data['absence_count'],
                        student_data['late_count'],
                        student_data['excuse_count'],
                        student_data['absence_dates'],
                        student_data['late_dates'],
                        student_data['excuse_dates'],
                        student_data['has_excuse'],
                        student_data['name'],
                        student_data['class_name'],
                        student_data['school_name']
                    )
                
                contacts_data.append({
                    'phone': student_data['phone'],
                    'name': student_data['name'],
                    'message': message_template
                })
            
            # Send messages
            results = self.whatsapp.send_bulk_messages(contacts_data, "{message}")
            
            # Add school phone info to results
            result_message = f'تم إرسال {results["success"]} رسالة بنجاح من أصل {results["total"]}'
            if school_phone:
                result_message += f' من رقم المدرسة: {school_phone}'
            
            return {
                'success': True,
                'message': result_message,
                'total': results['total'],
                'sent': results['success'],
                'failed': results['failed'],
                'failed_contacts': results['failed_contacts'],
                'school_phone': school_phone
            }
            
        except Exception as e:
            logger.error(f"Error sending absence notifications: {str(e)}")
            return {
                'success': False,
                'message': f'حدث خطأ أثناء إرسال الرسائل: {str(e)}',
                'total': 0,
                'sent': 0,
                'failed': 0
            }
        finally:
            # Close WhatsApp automation if available
            if self.whatsapp:
                self.whatsapp.close()

# Example usage
if __name__ == "__main__":
    # Initialize the service
    messaging_service = AbsenceMessagingService()
    
    # Send absence notifications
    results = messaging_service.send_absence_notifications(
        school_id=None,  # Set specific school ID if needed
        days_back=7,     # Look back 7 days
        custom_message=None  # Use default message template
    )
    
    print(f"Results: {results}")

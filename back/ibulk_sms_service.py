#!/usr/bin/env python3
"""
iBulk SMS Service Integration for Attendance System
Based on ismartsms.net iBulk SMS API

This service provides SMS messaging capabilities for attendance notifications
using the iBulk SMS service from Omantel.
"""

import logging
import requests
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from app.models import School, Student, Attendance, Class, Subject
from app import db
from app.config import get_oman_time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IBulkSMSService:
    """
    iBulk SMS service integration for attendance notifications
    """
    
    def __init__(self, school_id: int = None):
        """
        Initialize the iBulk SMS service
        
        Args:
            school_id (int): School ID to get configuration from
        """
        self.school_id = school_id
        self.school = None
        self.api_url = None
        self.username = None
        self.password = None
        self.sender_id = None
        
        if school_id:
            self.load_school_config()
    
    def load_school_config(self):
        """Load SMS configuration from school settings"""
        try:
            self.school = School.query.get(self.school_id)
            if not self.school:
                logger.error(f"School with ID {self.school_id} not found")
                return False
            
            # SMS is always enabled - no need to check ibulk_sms_enabled
            self.api_url = self.school.ibulk_api_url or 'https://ismartsms.net/api/send'
            self.username = self.school.ibulk_username
            self.password = self.school.ibulk_password
            self.sender_id = self.school.ibulk_sender_id
            
            if not all([self.username, self.password]):
                logger.error(f"Missing SMS credentials for school {self.school.name}")
                return False
            
            logger.info(f"SMS configuration loaded for school: {self.school.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading school SMS configuration: {str(e)}")
            return False
    
    def check_balance(self) -> Dict:
        """
        Check SMS account balance
        
        Returns:
            Dict: Balance information
        """
        try:
            if not self.username or not self.password:
                return {
                    'success': False,
                    'message': 'SMS credentials not configured',
                    'balance': 0.0
                }
            
            # iBulk SMS balance check endpoint
            balance_url = 'https://ismartsms.net/api/balance'
            
            payload = {
                'username': self.username,
                'password': self.password
            }
            
            response = requests.post(balance_url, data=payload, timeout=30)
            
            if response.status_code == 200:
                try:
                    balance_data = response.json()
                    balance = float(balance_data.get('balance', 0.0))
                    
                    # Update school balance in database
                    if self.school:
                        self.school.ibulk_current_balance = balance
                        self.school.ibulk_last_balance_check = get_oman_time().utcnow()
                        db.session.commit()
                    
                    return {
                        'success': True,
                        'message': 'Balance retrieved successfully',
                        'balance': balance,
                        'currency': 'OMR'
                    }
                except json.JSONDecodeError:
                    return {
                        'success': False,
                        'message': 'Invalid response format from SMS service',
                        'balance': 0.0
                    }
            else:
                return {
                    'success': False,
                    'message': f'SMS service error: {response.status_code}',
                    'balance': 0.0
                }
                
        except requests.RequestException as e:
            logger.error(f"Error checking SMS balance: {str(e)}")
            return {
                'success': False,
                'message': f'Network error: {str(e)}',
                'balance': 0.0
            }
        except Exception as e:
            logger.error(f"Unexpected error checking SMS balance: {str(e)}")
            return {
                'success': False,
                'message': f'Unexpected error: {str(e)}',
                'balance': 0.0
            }
    
    def send_single_sms(self, phone_number: str, message: str) -> Dict:
        """
        Send a single SMS message
        
        Args:
            phone_number (str): Phone number in international format
            message (str): Message content
            
        Returns:
            Dict: Send result
        """
        try:
            if not self.username or not self.password:
                return {
                    'success': False,
                    'message': 'SMS credentials not configured',
                    'message_id': None
                }
            
            # Format phone number for Oman (+968)
            formatted_phone = self._format_phone_number(phone_number)
            
            # Prepare SMS payload
            payload = {
                'username': self.username,
                'password': self.password,
                'to': formatted_phone,
                'message': message,
                'sender': self.sender_id or 'SCHOOL'
            }
            
            # Send SMS
            response = requests.post(self.api_url, data=payload, timeout=30)
            
            if response.status_code == 200:
                try:
                    result_data = response.json()
                    message_id = result_data.get('message_id', 'unknown')
                    
                    logger.info(f"SMS sent successfully to {formatted_phone}, Message ID: {message_id}")
                    
                    return {
                        'success': True,
                        'message': 'SMS sent successfully',
                        'message_id': message_id,
                        'phone': formatted_phone
                    }
                except json.JSONDecodeError:
                    return {
                        'success': False,
                        'message': 'Invalid response format from SMS service',
                        'message_id': None
                    }
            else:
                logger.error(f"SMS send failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'SMS service error: {response.status_code}',
                    'message_id': None
                }
                
        except requests.RequestException as e:
            logger.error(f"Network error sending SMS to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': f'Network error: {str(e)}',
                'message_id': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': f'Unexpected error: {str(e)}',
                'message_id': None
            }
    
    def send_bulk_sms(self, contacts_data: List[Dict], message_template: str) -> Dict:
        """
        Send bulk SMS messages
        
        Args:
            contacts_data (List[Dict]): List of contact dictionaries with 'phone' and 'name' keys
            message_template (str): Message template with {name} placeholder
            
        Returns:
            Dict: Bulk send results
        """
        results = {
            'total': len(contacts_data),
            'success': 0,
            'failed': 0,
            'failed_contacts': [],
            'sent_messages': []
        }
        
        logger.info(f"Starting bulk SMS to {len(contacts_data)} contacts...")
        
        for i, contact in enumerate(contacts_data, 1):
            try:
                phone = contact.get('phone', '')
                name = contact.get('name', 'Unknown')
                message = contact.get('message', '')
                
                if not phone:
                    results['failed'] += 1
                    results['failed_contacts'].append({
                        'name': name,
                        'phone': phone,
                        'reason': 'No phone number provided'
                    })
                    continue
                
                logger.info(f"Processing {i}/{len(contacts_data)}: {name} ({phone})")
                
                # Use pre-formatted message if available, otherwise personalize template
                if message:
                    personalized_message = message
                else:
                    personalized_message = message_template.format(name=name)
                
                # Send SMS
                send_result = self.send_single_sms(phone, personalized_message)
                
                if send_result['success']:
                    results['success'] += 1
                    results['sent_messages'].append({
                        'name': name,
                        'phone': phone,
                        'message_id': send_result.get('message_id'),
                        'timestamp': datetime.now().isoformat()
                    })
                    logger.info(f"✓ SMS sent to {name}")
                else:
                    results['failed'] += 1
                    results['failed_contacts'].append({
                        'name': name,
                        'phone': phone,
                        'reason': send_result.get('message', 'Unknown error')
                    })
                    logger.error(f"✗ Failed to send SMS to {name}: {send_result.get('message')}")
                
                # Add delay between messages to avoid rate limiting
                import time
                time.sleep(0.5)  # 500ms delay between messages
                
            except Exception as e:
                results['failed'] += 1
                results['failed_contacts'].append({
                    'name': contact.get('name', 'Unknown'),
                    'phone': contact.get('phone', ''),
                    'reason': f'Error: {str(e)}'
                })
                logger.error(f"Error processing contact {contact}: {str(e)}")
        
        logger.info(f"Bulk SMS completed. Success: {results['success']}, Failed: {results['failed']}")
        return results
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for Oman (+968)
        
        Args:
            phone (str): Phone number to format
            
        Returns:
            str: Formatted phone number
        """
        # Remove all non-digit characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Add Oman country code if not present
        if not clean_phone.startswith('968') and len(clean_phone) == 8:
            clean_phone = '968' + clean_phone
        elif len(clean_phone) == 9 and clean_phone.startswith('9'):
            clean_phone = '968' + clean_phone[1:]
        
        return clean_phone
    
    def is_configured(self) -> bool:
        """
        Check if SMS service is properly configured
        
        Returns:
            bool: True if configured, False otherwise
        """
        return bool(self.username and self.password and self.school)


class AttendanceSMSService:
    """
    Specialized service for sending attendance-related SMS notifications
    """
    
    def __init__(self, school_id: int):
        """
        Initialize attendance SMS service
        
        Args:
            school_id (int): School ID
        """
        self.school_id = school_id
        self.sms_service = IBulkSMSService(school_id)
        self.school = School.query.get(school_id) if school_id else None
    
    def create_attendance_message(self, student_name: str, class_name: str, 
                                 date: str, attendance_status: str, 
                                 excuse_status: str) -> str:
        """
        Create attendance notification message
        
        Args:
            student_name (str): Student's name
            class_name (str): Class name
            date (str): Attendance date
            attendance_status (str): Attendance status details
            excuse_status (str): Excuse status
            
        Returns:
            str: Formatted message
        """
        school_name = self.school.name if self.school else "المدرسة"
        
        message = f"""تقرير الحضور اليومي

المدرسة: {school_name}
الطالب/ة: {student_name}
الصف: {class_name}
التاريخ: {date}

حالة الحضور:
{attendance_status}

حالة العذر: {excuse_status}

---
تم إرسال هذا التقرير من نظام إدارة الحضور"""
        
        return message
    
    def send_daily_attendance_reports(self, date: str = None) -> Dict:
        """
        Send daily attendance reports to students with absences
        
        Args:
            date (str): Date in YYYY-MM-DD format (defaults to today)
            
        Returns:
            Dict: Results of the SMS operation
        """
        try:
            if not self.sms_service.is_configured():
                return {
                    'success': False,
                    'message': 'SMS service is not configured for this school',
                    'total': 0,
                    'sent': 0,
                    'failed': 0
                }
            
            # Use today's date if not provided
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            # Get students with attendance issues for the date
            students_data = self._get_students_with_attendance_issues(date)
            
            if not students_data:
                return {
                    'success': True,
                    'message': 'لا توجد طلاب لديهم مشاكل في الحضور لهذا اليوم',
                    'total': 0,
                    'sent': 0,
                    'failed': 0
                }
            
            # Prepare contacts data
            contacts_data = []
            for student in students_data:
                if student.get('phone_number'):
                    # Create personalized message
                    message = self.create_attendance_message(
                        student_name=student.get('student_name', 'الطالب'),
                        class_name=student.get('class_name', 'الصف'),
                        date=date,
                        attendance_status=self._format_attendance_status(student),
                        excuse_status='لديه عذر' if student.get('is_has_exuse') else 'لا يوجد عذر'
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
            
            # Send bulk SMS
            results = self.sms_service.send_bulk_sms(contacts_data, '{message}')
            
            # Update message for results
            if results['success'] > 0:
                results['message'] = f"تم إرسال {results['success']} رسالة SMS بنجاح"
            else:
                results['message'] = "فشل في إرسال الرسائل. يرجى المحاولة مرة أخرى."
            
            return results
            
        except Exception as e:
            logger.error(f"Error sending daily attendance reports: {str(e)}")
            return {
                'success': False,
                'message': f'حدث خطأ أثناء إرسال التقارير: {str(e)}',
                'total': 0,
                'sent': 0,
                'failed': 0
            }
    
    def _get_students_with_attendance_issues(self, date: str) -> List[Dict]:
        """
        Get students with attendance issues for a specific date
        
        Args:
            date (str): Date in YYYY-MM-DD format
            
        Returns:
            List[Dict]: List of students with attendance issues
        """
        try:
            # Parse date
            attendance_date = datetime.strptime(date, '%Y-%m-%d').date()
            
            # Query students with attendance issues
            attendance_records = db.session.query(
                Attendance.student_id,
                Attendance.class_id,
                Attendance.class_time_num,
                Attendance.is_Acsent,
                Attendance.is_Excus,
                Attendance.is_late,
                Attendance.ExcusNote,
                Student.fullName.label('student_name'),
                Student.phone_number,
                Class.name.label('class_name')
            ).join(
                Student, Student.id == Attendance.student_id
            ).join(
                Class, Class.id == Attendance.class_id
            ).filter(
                Attendance.date == attendance_date,
                Class.school_id == self.school_id,
                db.or_(
                    Attendance.is_Acsent == True,
                    Attendance.is_Excus == True,
                    Attendance.is_late == True
                )
            ).all()
            
            # Group by student
            students_data = {}
            for record in attendance_records:
                student_id = record.student_id
                
                if student_id not in students_data:
                    students_data[student_id] = {
                        'student_id': student_id,
                        'student_name': record.student_name,
                        'phone_number': record.phone_number,
                        'class_name': record.class_name,
                        'absent_times': [],
                        'late_times': [],
                        'excused_times': [],
                        'is_has_exuse': False
                    }
                
                # Add attendance issues
                if record.is_Acsent:
                    students_data[student_id]['absent_times'].append(record.class_time_num)
                if record.is_late:
                    students_data[student_id]['late_times'].append(record.class_time_num)
                if record.is_Excus:
                    students_data[student_id]['excused_times'].append(record.class_time_num)
                
                # Check for excuse note
                if record.ExcusNote and record.ExcusNote.strip() not in [None, "-", "", " "]:
                    students_data[student_id]['is_has_exuse'] = True
            
            return list(students_data.values())
            
        except Exception as e:
            logger.error(f"Error getting students with attendance issues: {str(e)}")
            return []
    
    def _format_attendance_status(self, student: Dict) -> str:
        """
        Format attendance status for the message
        
        Args:
            student (Dict): Student data dictionary
            
        Returns:
            str: Formatted attendance status
        """
        absent_times = student.get('absent_times', [])
        late_times = student.get('late_times', [])
        excused_times = student.get('excused_times', [])
        
        status_parts = []
        
        if absent_times:
            status_parts.append(f"هارب في الحصص: {', '.join(map(str, sorted(absent_times)))}")
        
        if late_times:
            status_parts.append(f"متأخر في الحصص: {', '.join(map(str, sorted(late_times)))}")
        
        if excused_times:
            status_parts.append(f"غائب في الحصص: {', '.join(map(str, sorted(excused_times)))}")
        
        if not status_parts:
            status_parts.append("حضر جميع الحصص")
        
        return '\n'.join(status_parts)


# Global service instances
def get_ibulk_sms_service(school_id: int) -> IBulkSMSService:
    """Get iBulk SMS service instance for a school"""
    return IBulkSMSService(school_id)

def get_attendance_sms_service(school_id: int) -> AttendanceSMSService:
    """Get attendance SMS service instance for a school"""
    return AttendanceSMSService(school_id)

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
            self.api_url = self.school.ibulk_api_url or 'https://ismartsms.net/RestApi/api/SMS/PostSMS'
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
            
            # Generate possible balance URLs based on API URL pattern
            possible_balance_urls = []
            
            if self.api_url:
                # Pattern 1: RestApi pattern (https://ismartsms.net/RestApi/api/SMS/PostSMS)
                if '/RestApi/' in self.api_url and '/SMS/' in self.api_url:
                    base_url = self.api_url.rsplit('/SMS/', 1)[0] + '/SMS'
                    # Try different balance endpoint patterns
                    possible_balance_urls.extend([
                        f"{base_url}/GetBalance",
                        f"{base_url}/Balance",
                        f"{base_url}/CheckBalance",
                        f"{base_url}/GetAccountBalance",
                        f"{base_url}/AccountBalance",
                        f"{base_url}/PostBalance",  # Some APIs use Post for balance too
                        # Try using the same PostSMS endpoint with balance query parameter
                        f"{self.api_url}?action=balance",
                        f"{self.api_url}?type=balance"
                    ])
                # Pattern 2: Standard API pattern
                elif '/PostSMS' in self.api_url:
                    base_url = self.api_url.replace('/PostSMS', '')
                    possible_balance_urls.extend([
                        f"{base_url}/GetBalance",
                        f"{base_url}/Balance",
                        f"{base_url}/CheckBalance"
                    ])
                # Pattern 3: /send pattern
                elif '/send' in self.api_url:
                    base_url = self.api_url.replace('/send', '').replace('/api/send', '/api')
                    possible_balance_urls.extend([
                        f"{base_url}/balance",
                        f"{base_url}/Balance",
                        f"{base_url}/checkbalance"
                    ])
            
            # Add default URLs
            possible_balance_urls.extend([
                'https://ismartsms.net/RestApi/api/SMS/GetBalance',
                'https://ismartsms.net/RestApi/api/SMS/Balance',
                'https://ismartsms.net/api/balance',
                'https://ismartsms.net/api/checkbalance'
            ])
            
            # Remove duplicates
            seen = set()
            possible_balance_urls = [url for url in possible_balance_urls if url not in seen and not seen.add(url)]
            
            # Prepare payload variants based on API documentation
            # The API uses JSON with UserID/Password (not username/password)
            payload_variants = [
                {'UserID': self.username, 'Password': self.password},
                {'UserName': self.username, 'Password': self.password},
                {'username': self.username, 'password': self.password},
            ]
            
            # Try each URL and payload combination
            last_error = None
            response = None
            
            for balance_url in possible_balance_urls:
                for payload in payload_variants:
                    try:
                        logger.info(f"Trying balance check: {balance_url} with params: {list(payload.keys())}")
                        # API uses JSON, not form-data
                        response = requests.post(
                            balance_url, 
                            json=payload,  # Use json= instead of data=
                            headers={'Content-Type': 'application/json'},
                            timeout=30
                        )
                        logger.info(f"Response: {response.status_code}, body: {response.text[:200]}")
                        
                        if response.status_code in [200, 201]:
                            try:
                                response_data = response.json()
                                
                                # Check for error code in response
                                # Note: API uses Code 1 for success (Message Pushed), Code 0 might also be success
                                if 'Code' in response_data:
                                    code = response_data.get('Code')
                                    # Code 1 = success, Code 0 = success (some APIs), other codes = error
                                    if code in [0, 1]:
                                        # Success! Extract balance
                                        balance = 0.0
                                        
                                        # Try different balance field names
                                        if 'Balance' in response_data:
                                            balance = float(response_data.get('Balance', 0.0))
                                        elif 'balance' in response_data:
                                            balance = float(response_data.get('balance', 0.0))
                                        elif 'Data' in response_data and isinstance(response_data['Data'], dict):
                                            if 'Balance' in response_data['Data']:
                                                balance = float(response_data['Data'].get('Balance', 0.0))
                                        
                                        if balance > 0 or 'Balance' in str(response_data):
                                            # Update school balance
                    if self.school:
                        self.school.ibulk_current_balance = balance
                        self.school.ibulk_last_balance_check = get_oman_time().utcnow()
                        db.session.commit()
                    
                                            logger.info(f"Balance retrieved successfully: {balance} OMR")
                                            return {
                                                'success': True,
                                                'message': 'Balance retrieved successfully',
                                                'balance': balance,
                                                'currency': 'OMR'
                                            }
                                    else:
                                        # Non-zero code means error - map to human-readable message
                                        error_msg = self._get_error_message(code, response_data.get('Message', 'Unknown error'))
                                        last_error = f"Code {code}: {error_msg}"
                                        logger.warning(f"Balance check returned error code {code}: {error_msg}")
                                        # Continue to try next URL/payload
                                        continue
                                else:
                                    # No Code field, try to extract balance directly
                                    if 'Balance' in response_data:
                                        balance = float(response_data.get('Balance', 0.0))
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
                                logger.warning(f"Invalid JSON response from {balance_url}")
                                continue
                        elif response.status_code != 404:
                            # Non-404 error, might be auth issue - don't try other payloads for this URL
                            try:
                                error_data = response.json()
                                if 'Code' in error_data:
                                    code = error_data.get('Code')
                                    error_msg = self._get_error_message(code, error_data.get('Message', 'Unknown'))
                                    last_error = f"Code {code}: {error_msg}"
                                else:
                                    last_error = f"HTTP {response.status_code}: {response.text[:100]}"
                            except:
                                last_error = f"HTTP {response.status_code}: {response.text[:100]}"
                            break  # Try next URL
                    except requests.RequestException as e:
                        logger.warning(f"Connection error to {balance_url}: {str(e)}")
                        continue
            
            # All attempts failed
            if last_error:
                # If we got Code 11 or 404, it likely means balance endpoint doesn't exist
                if 'Code 11' in last_error or '404' in last_error or 'HTML' in str(response.text[:100] if response else ''):
                    error_msg = f"Balance endpoint not available: The balance check endpoint may not be available in this API version. This is normal - balance checking is optional."
                    logger.info(f"Balance endpoint not available (this is OK): {error_msg}")
                else:
                    error_msg = f"SMS service error: {last_error}"
                    logger.warning(f"Balance check failed: {error_msg}")
            else:
                error_msg = "SMS service error: Could not connect to balance endpoint"
                logger.warning(f"Balance check failed: {error_msg}")
            
            # Return failure but note that this is expected if endpoint doesn't exist
                return {
                    'success': False,
                'message': error_msg,
                'balance': 0.0,
                'note': 'Balance endpoint may not be available in this API version. This is normal and does not affect SMS sending.'
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
            
            # Format phone number for Oman (+968) - must be exactly 11 digits
            formatted_phone = self._format_phone_number(phone_number)
            
            # Validate phone number length (API requires exactly 11 digits)
            if len(formatted_phone) != 11:
                logger.error(f"Invalid phone number format: {phone_number} -> {formatted_phone} (length: {len(formatted_phone)})")
                return {
                    'success': False,
                    'message': f'Invalid phone number format. Expected 11 digits (968XXXXXXXXX), got {len(formatted_phone)} digits: {formatted_phone}',
                    'message_id': None
                }
            
            # Validate phone number starts with 968
            if not formatted_phone.startswith('968'):
                logger.error(f"Phone number must start with 968: {formatted_phone}")
                return {
                    'success': False,
                    'message': f'Phone number must start with 968 (Oman country code). Got: {formatted_phone}',
                    'message_id': None
                }
            
            # Prepare SMS payload according to API documentation
            # API expects: UserID, Password, Message, Language, MobileNo (array), RecipientType
            payload = {
                'UserID': self.username,
                'Password': self.password,
                'Message': message,
                'Language': '64',  # Default language code (can be made configurable)
                'MobileNo': [formatted_phone],  # Array of phone numbers
                'RecipientType': '1',  # Default recipient type
                'ScheddateTime': ''  # Empty for immediate send
            }
            
            # Add sender ID if configured
            # Note: Some APIs use different field names. Try both common variations.
            # IMPORTANT: If SenderID is not approved by the provider, messages may be queued but not delivered
            if self.sender_id:
                # Try both field name variations
                payload['SenderID'] = self.sender_id
                # Some APIs might use 'SenderId' or 'Sender' - but let's stick with SenderID for now
                logger.info(f"Using SenderID: {self.sender_id} - If messages are not delivered, SenderID may not be approved by provider")
            else:
                logger.warning("No SenderID configured - Messages will be sent without custom sender ID")
            
            # Log the payload (without password for security)
            payload_log = payload.copy()
            payload_log['Password'] = '***HIDDEN***'
            logger.info(f"Sending SMS to {formatted_phone} with payload: {json.dumps(payload_log, ensure_ascii=False)}")
            logger.info(f"Sender ID: {self.sender_id if self.sender_id else 'Not configured'}")
            
            # Try JSON format first, then fallback to form-data if SOAP error
            response = None
            try:
                # Send SMS using JSON format
                response = requests.post(
                    self.api_url, 
                    json=payload,  # Use json= instead of data=
                    headers={'Content-Type': 'application/json', 'Cache-Control': 'no-cache'},
                    timeout=30
                )
                
                # Check if response is SOAP error (indicates API expects form-data)
                if response.status_code == 500 and 'soap' in response.text.lower():
                    logger.warning("API returned SOAP error, retrying with form-data format")
                    # Retry with form-data
                    response = requests.post(
                        self.api_url,
                        data=payload,  # Use data= for form-data
                        headers={'Cache-Control': 'no-cache'},
                        timeout=30
                    )
            except requests.RequestException as e:
                # If JSON fails, try form-data
                logger.warning(f"JSON request failed, retrying with form-data: {str(e)}")
                try:
                    response = requests.post(
                        self.api_url,
                        data=payload,  # Use data= for form-data
                        headers={'Cache-Control': 'no-cache'},
                        timeout=30
                    )
                except requests.RequestException as e2:
                    raise e2
            
            # Log the full response for debugging
            logger.info(f"SMS API Response - Status: {response.status_code}, Body: {response.text[:500]}")
            
            # API returns 200/201 for successful requests, but checks Code field in response
            if response.status_code in [200, 201]:
                try:
                    # Try to parse as JSON first
                try:
                    result_data = response.json()
                    except (json.JSONDecodeError, ValueError):
                        # Response might be XML/SOAP or other format
                        logger.warning(f"Response is not JSON, checking for success indicators: {response.text[:200]}")
                        response_text = response.text.lower()
                        
                        # Check if response contains success indicators even if not JSON
                        if 'code' in response_text and ('1' in response_text or 'success' in response_text or 'pushed' in response_text):
                            # Might be XML with success code
                            logger.info("Response appears to indicate success despite non-JSON format")
                            return {
                                'success': True,
                                'message': 'SMS sent successfully (non-JSON response)',
                                'message_id': 'unknown',
                                'phone': formatted_phone,
                                'note': 'Message pushed to queue. Delivery may take a few minutes.'
                            }
                        
                        # If we can't parse and no success indicators, return error
                        logger.error(f"Invalid response format: {response.text[:200]}")
                        return {
                            'success': False,
                            'message': 'Invalid response format from SMS service (expected JSON, got XML/SOAP)',
                            'message_id': None
                        }
                    
                    # Check Code field: Code 1 = success (Message Pushed), other codes = error
                    code = result_data.get('Code', -1)
                    
                    if code == 1:
                        # Success! Extract message ID if available
                        message_id = result_data.get('MessageID', result_data.get('message_id', 'unknown'))
                        message_text = result_data.get('Message', 'SMS sent successfully')
                        
                        logger.info(f"SMS sent successfully to {formatted_phone}, Code: {code}, Message: {message_text}")
                        logger.info(f"Full API response: {json.dumps(result_data, ensure_ascii=False)}")
                        
                        # Important: Code 1 means "Message Pushed" to queue, not necessarily delivered
                        # Delivery can take time and depends on:
                        # 1. SenderID approval status
                        # 2. Network conditions
                        # 3. Recipient's phone status
                        # 4. Message content compliance
                        
                        # Update balance after successful send (if school is configured)
                        # Note: Balance endpoint may not be available, so this is optional
                        if self.school:
                            try:
                                # Check balance to update it (non-blocking, may fail if endpoint doesn't exist)
                                balance_result = self.check_balance()
                                if balance_result.get('success'):
                                    logger.info(f"Balance updated after SMS send: {balance_result.get('balance', 0)} OMR")
                                else:
                                    # Balance check failed (endpoint may not exist) - this is OK
                                    logger.info(f"Balance check unavailable (endpoint may not exist): {balance_result.get('message', 'Unknown')}")
                            except Exception as e:
                                # Balance check failed - this is OK, endpoint may not exist
                                logger.info(f"Balance check not available: {str(e)}")
                        
                        # Build detailed response with troubleshooting info
                        response_data = {
                        'success': True,
                            'message': message_text or 'SMS sent successfully',
                        'message_id': message_id,
                            'phone': formatted_phone,
                            'note': 'Message pushed to queue. Delivery may take a few minutes. If not received, check: 1) SenderID approval, 2) Phone number validity, 3) Network status'
                        }
                        
                        # Add troubleshooting information
                        troubleshooting = []
                        if self.sender_id:
                            troubleshooting.append(f"SenderID '{self.sender_id}' is configured. If messages are not delivered, verify with your provider that this SenderID is approved and active.")
                        else:
                            troubleshooting.append("No SenderID configured. Messages will use default sender ID.")
                        
                        troubleshooting.append("Check your iBulk SMS dashboard for delivery reports and status.")
                        troubleshooting.append("Delivery can take 5-15 minutes. Wait before retrying.")
                        troubleshooting.append("If still not received after 15 minutes, contact Infocomm/Omantel support: +968 24151020")
                        
                        response_data['troubleshooting'] = troubleshooting
                        
                        return response_data
                    else:
                        # Error code in response - map to human-readable message
                        error_message = self._get_error_message(code, result_data.get('Message', 'Unknown error'))
                        logger.error(f"SMS send failed: Code {code} - {error_message}")
                        
                        return {
                            'success': False,
                            'message': f'SMS service error (Code {code}): {error_message}',
                            'message_id': None
                    }
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON response: {response.text[:200]}")
                    return {
                        'success': False,
                        'message': 'Invalid response format from SMS service',
                        'message_id': None
                    }
            else:
                logger.error(f"SMS send failed: HTTP {response.status_code} - {response.text[:200]}")
                return {
                    'success': False,
                    'message': f'SMS service error: HTTP {response.status_code}',
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
    
    def _get_error_message(self, code: int, default_message: str = '') -> str:
        """
        Map error codes to human-readable messages based on API documentation
        
        Args:
            code (int): Error code from API
            default_message (str): Default message if code not found
            
        Returns:
            str: Human-readable error message
        """
        error_messages = {
            1: 'Message Pushed successfully',
            2: 'Company Not Exists. Please check the company.',
            3: 'User or Password is wrong',
            4: 'Credit is Low',
            5: 'Message is blank',
            6: 'Message Length Exceeded',
            7: 'Account is Inactive',
            8: 'Mobile No length is empty',
            9: 'Invalid Mobile No',
            10: 'Invalid Language',
            11: 'Unknown Error',
            12: 'Account is Blocked by administrator, concurrent failure of login',
            13: 'Account Expired',
            14: 'Credit Expired',
            15: 'Invalid Http request or Parameter fields are wrong',
            16: 'Invalid date time parameter',
            18: 'Web Service User not registered - Please contact your SMS provider (Infocomm/Omantel) to enable REST API access for your account. Your account may be valid for web interface but not registered for REST API service.',
            20: 'Client IP Address has been blocked',
            21: 'Client IP is outside Oman, Outside Oman IP is not allowed to access web service',
            22: 'Wrong Flash message parameter, Please pass "y" for flash sms',
            23: 'Mobile Number Optout by the customer. SMS Not Sent.'
        }
        
        # Return mapped message or default
        message = error_messages.get(code, default_message or f'Unknown error (Code {code})')
        
        # For balance check, Code 11 often means endpoint doesn't exist
        if code == 11:
            return f'{message} - Balance endpoint may not exist or use different parameters'
        
        return message
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for Oman (+968)
        API requires exactly 11 digits: 968XXXXXXXXX (968 + 8 digits)
        
        Args:
            phone (str): Phone number to format
            
        Returns:
            str: Formatted phone number (11 digits)
        """
        # Remove all non-digit characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # If already starts with 968 and is 11 digits, return as is
        if clean_phone.startswith('968') and len(clean_phone) == 11:
            return clean_phone
        
        # If starts with 968 but not 11 digits, try to fix
        if clean_phone.startswith('968'):
            # If it's longer than 11, take first 11
            if len(clean_phone) > 11:
                clean_phone = clean_phone[:11]
            # If it's shorter, pad with zeros (shouldn't happen, but handle it)
            elif len(clean_phone) < 11:
                # This is invalid, but we'll try to fix
                while len(clean_phone) < 11:
                    clean_phone = clean_phone + '0'
        
        # If 8 digits (local number), add 968
        elif len(clean_phone) == 8:
            clean_phone = '968' + clean_phone
        
        # If 9 digits and starts with 9, add 968 and remove first 9
        elif len(clean_phone) == 9 and clean_phone.startswith('9'):
            clean_phone = '968' + clean_phone[1:]
        
        # If 10 digits, might be missing country code
        elif len(clean_phone) == 10:
            # If starts with 968, it's already 10 digits of 968XXXXXXXXX, add one more
            # Actually, this shouldn't happen. Let's check if it starts with 968
            if not clean_phone.startswith('968'):
                # It's probably 968XXXXXXXX, add one more digit (shouldn't happen)
                clean_phone = '968' + clean_phone[2:] if clean_phone.startswith('96') else '968' + clean_phone
        
        # Ensure exactly 11 digits
        if len(clean_phone) != 11:
            logger.warning(f"Phone number {phone} formatted to {clean_phone} but length is {len(clean_phone)}, not 11")
            # Try to fix: if too long, truncate; if too short, pad
            if len(clean_phone) > 11:
                clean_phone = clean_phone[:11]
            elif len(clean_phone) < 11 and clean_phone.startswith('968'):
                # Pad with zeros (this shouldn't happen in practice)
                clean_phone = clean_phone.ljust(11, '0')
        
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

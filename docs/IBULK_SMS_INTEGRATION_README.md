# iBulk SMS Integration for Attendance System

This document describes the integration of iBulk SMS service from Omantel (ismartsms.net) into the attendance management system.

## Overview

The SMS integration allows schools to automatically send attendance reports to students' parents via SMS messages. This feature uses the iBulk SMS service provided by Omantel to send bulk SMS messages for attendance notifications.

## Features

### 1. SMS Configuration Management
- **School-level Configuration**: Each school can configure its own SMS settings
- **Credentials Management**: Secure storage of iBulk SMS username and password
- **Sender ID Configuration**: Custom sender ID for branding (max 11 characters)
- **Balance Monitoring**: Automatic balance checking and threshold alerts
- **Connection Testing**: Test SMS service connectivity and credentials

### 2. Attendance SMS Notifications
- **Daily Reports**: Send daily attendance reports to students with attendance issues
- **Personalized Messages**: Customized messages with student name, class, and attendance details
- **Bulk Sending**: Efficient bulk SMS sending with rate limiting
- **Status Tracking**: Track success/failure rates for sent messages

### 3. SMS Operations
- **Test SMS**: Send test messages to verify configuration
- **Balance Check**: Check SMS account balance
- **Delivery Reports**: Track message delivery status

## Technical Implementation

### Backend Components

#### 1. Database Schema Updates
```sql
-- New fields added to schools table
ALTER TABLE schools ADD COLUMN ibulk_sms_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN ibulk_username VARCHAR(100);
ALTER TABLE schools ADD COLUMN ibulk_password VARCHAR(255);
ALTER TABLE schools ADD COLUMN ibulk_sender_id VARCHAR(11);
ALTER TABLE schools ADD COLUMN ibulk_api_url VARCHAR(255) DEFAULT 'https://ismartsms.net/api/send';
ALTER TABLE schools ADD COLUMN ibulk_balance_threshold FLOAT DEFAULT 10.0;
ALTER TABLE schools ADD COLUMN ibulk_last_balance_check DATETIME;
ALTER TABLE schools ADD COLUMN ibulk_current_balance FLOAT DEFAULT 0.0;
```

#### 2. SMS Service (`ibulk_sms_service.py`)
- **IBulkSMSService**: Core SMS service class
- **AttendanceSMSService**: Specialized service for attendance notifications
- **Balance Management**: Automatic balance checking and updates
- **Error Handling**: Comprehensive error handling and logging

#### 3. API Endpoints
- `GET /static/sms-config` - Get SMS configuration
- `PUT /static/sms-config` - Update SMS configuration
- `POST /static/test-sms-connection` - Test SMS connection
- `POST /attendance/send-daily-sms-reports` - Send daily reports
- `GET /attendance/check-sms-balance` - Check SMS balance
- `POST /attendance/send-test-sms` - Send test SMS

### Frontend Components

#### 1. SMS Configuration Component (`SmsConfiguration.js`)
- Configuration form for SMS settings
- Connection testing interface
- Balance checking functionality
- Test SMS sending capability

#### 2. SMS Operations Component (`SmsOperations.js`)
- Daily report sending interface
- Results tracking and display
- Error handling and user feedback

#### 3. Integration with Schools Page
- SMS configuration button in school actions
- SMS operations button for sending reports
- Modal-based interface for SMS management

## Configuration Guide

### 1. School Administrator Setup

1. **Access SMS Configuration**:
   - Go to Schools page
   - Click on SMS Settings (⚙️) button for the school
   - Configure SMS settings

2. **Required Information**:
   - **Username**: iBulk SMS account username
   - **Password**: iBulk SMS account password
   - **Sender ID**: Custom sender ID (optional, max 11 characters)
   - **API URL**: SMS service endpoint (default: https://ismartsms.net/api/send)
   - **Balance Threshold**: Minimum balance alert threshold (default: 10 OMR)

3. **Testing Configuration**:
   - Click "Test Connection" to verify credentials
   - Check balance to ensure sufficient funds
   - Send test SMS to verify functionality

### 2. SMS Pricing (iBulk SMS)

Based on the official iBulk SMS pricing:

| Messages | Price (OMR) | Validity | Cost per SMS (OMR) |
|----------|-------------|----------|-------------------|
| 1,000    | 9           | 1 Month  | 0.009             |
| 3,000    | 27          | 1 Month  | 0.009             |
| 5,000    | 45          | 3 Months | 0.009             |
| 10,000   | 85          | 3 Months | 0.0085            |
| 15,000   | 120         | 3 Months | 0.008             |
| 25,000   | 188         | 6 Months | 0.00752           |
| 50,000   | 338         | 6 Months | 0.00676           |
| 100,000  | 600         | 6 Months | 0.006             |

*All prices are exclusive of 5% VAT*

### 3. Message Format

#### English Messages
- **1 Part SMS**: 160 characters
- **2 Part SMS**: 306 characters
- **3 Part SMS**: 459 characters

#### Arabic Messages
- **1 Part SMS**: 70 characters
- **2 Part SMS**: 134 characters
- **3 Part SMS**: 201 characters

## Usage Instructions

### 1. Sending Daily Attendance Reports

1. **Access SMS Operations**:
   - Go to Schools page
   - Click on SMS Operations (📱) button for the school

2. **Select Date**:
   - Choose the date for which to send reports
   - Default is today's date

3. **Send Reports**:
   - Click "Send Reports" button
   - System will automatically identify students with attendance issues
   - Send personalized SMS messages to parents

4. **Monitor Results**:
   - View success/failure statistics
   - Check detailed results for each message
   - Review failed messages and reasons

### 2. Message Content

The system automatically generates personalized messages in Arabic:

```
تقرير الحضور اليومي

المدرسة: [School Name]
الطالب/ة: [Student Name]
الصف: [Class Name]
التاريخ: [Date]

حالة الحضور:
هارب في الحصص: 1, 3
متأخر في الحصص: 2
غائب في الحصص: 4

حالة العذر: لديه عذر / لا يوجد عذر

---
تم إرسال هذا التقرير من نظام إدارة الحضور
```

## Security Considerations

1. **Password Storage**: SMS passwords are stored securely in the database
2. **API Security**: All SMS API calls use HTTPS encryption
3. **Access Control**: Only authorized users (admin, school_admin) can configure SMS
4. **Rate Limiting**: Built-in delays between messages to prevent spam

## Error Handling

The system includes comprehensive error handling for:

1. **Network Issues**: Connection timeouts and network errors
2. **Authentication Failures**: Invalid credentials
3. **Insufficient Balance**: Low account balance
4. **Invalid Phone Numbers**: Malformed phone numbers
5. **API Errors**: Service-specific error responses

## Monitoring and Logging

1. **Action Logging**: All SMS operations are logged in the system
2. **Balance Tracking**: Automatic balance updates and monitoring
3. **Delivery Reports**: Track message delivery status
4. **Error Logging**: Detailed error logging for troubleshooting

## Troubleshooting

### Common Issues

1. **Connection Failed**:
   - Verify username and password
   - Check internet connectivity
   - Ensure API URL is correct

2. **Insufficient Balance**:
   - Check account balance
   - Top up iBulk SMS account
   - Adjust balance threshold

3. **Messages Not Delivered**:
   - Verify phone number format
   - Check if phone numbers are valid
   - Ensure students have phone numbers in system

4. **Invalid Sender ID**:
   - Sender ID must be alphanumeric
   - Maximum 11 characters
   - No special characters allowed

### Support

For technical support with iBulk SMS service:
- **Phone**: +968 24151020 / 21
- **Email**: sales@ismartsms.net
- **WhatsApp**: +96824151020

## Migration Instructions

To apply the database changes:

1. **Run Migration**:
   ```bash
   cd back
   flask db upgrade
   ```

2. **Verify Changes**:
   ```sql
   DESCRIBE schools;
   ```

3. **Test Configuration**:
   - Configure SMS settings for a test school
   - Test connection and send test SMS
   - Verify functionality

## Future Enhancements

Potential future improvements:

1. **Scheduled Reports**: Automatic daily report sending
2. **Custom Templates**: User-defined message templates
3. **Multi-language Support**: Support for English messages
4. **Advanced Analytics**: Detailed SMS usage analytics
5. **Integration with Other Services**: WhatsApp, Email integration
6. **Bulk Import**: Import phone numbers from Excel files
7. **Delivery Confirmation**: Real-time delivery status updates

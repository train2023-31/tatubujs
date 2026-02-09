# Bulk WhatsApp Daily Reports

This system provides bulk messaging capabilities for daily attendance reports using pywhatkit, optimized for PythonAnywhere deployment.

## Features

- **Bulk Messaging**: Send daily reports to multiple students at once
- **Scheduled Delivery**: Messages are scheduled with delays to avoid rate limiting
- **PythonAnywhere Compatible**: Uses pywhatkit instead of Selenium for better server compatibility
- **Smart Filtering**: Only sends messages to students with attendance issues
- **Detailed Reporting**: Provides comprehensive success/failure statistics

## Installation

1. **Install pywhatkit**:
   ```bash
   pip install pywhatkit==5.4
   pip install pyvirtualdisplay==3.0
   ```

2. **Verify Installation**:
   ```bash
   python test_pywhatkit.py
   ```

## Usage

### API Endpoint

**POST** `/api/static/send-bulk-daily-reports`

**Request Body**:
```json
{
  "date": "2024-01-15",
  "school_id": 1,
  "delay_between_messages": 2
}
```

**Response**:
```json
{
  "message": "تم جدولة 5 رسالة للإرسال. سيتم إرسالها خلال الدقائق القادمة.",
  "total": 5,
  "sent": 5,
  "failed": 0,
  "scheduled_messages": [
    {
      "name": "أحمد محمد",
      "phone": "+96812345678",
      "scheduled_time": "14:30"
    }
  ],
  "failed_contacts": []
}
```

### Frontend Integration

The bulk messaging feature is integrated into the Daily Report page:

1. Navigate to **Daily Report** page
2. Select the desired date
3. Click **"إرسال تقارير يومية مجمعة"** button
4. Confirm the action in the modal
5. Messages will be scheduled and sent automatically

## How It Works

### 1. Data Collection
- Queries attendance records for the specified date
- Filters students with attendance issues (absent, late, excused)
- Only includes students with valid phone numbers

### 2. Message Scheduling
- Uses pywhatkit to schedule messages
- Adds delays between messages (default: 2 minutes)
- Automatically opens WhatsApp Web in Chrome

### 3. Message Format
```
*تقرير الحضور اليومي*

*المدرسة:* [School Name]
*الطالب/ة:* [Student Name]
*الصف:* [Class Name]
*التاريخ:* [Date]

*حالة الحضور:*
هارب في الحصص: 1, 2
متأخر في الحصص: 3
غائب في الحصص: 4

*حالة العذر:* لا يوجد عذر

---
تم إرسال هذا التقرير من نظام إدارة الحضور
```

## Configuration

### Environment Variables
- No additional environment variables required
- Uses system's default Chrome installation

### Customization Options
- **Delay between messages**: Configurable (default: 2 minutes)
- **Message template**: Customizable in `bulk_whatsapp_service.py`
- **Phone number formatting**: Automatic Oman (+968) country code

## Requirements

### System Requirements
- **PythonAnywhere**: Paid plan (required for pywhatkit)
- **Chrome Browser**: Must be installed and accessible
- **WhatsApp Web**: Must be logged in and accessible

### Python Dependencies
```
pywhatkit==5.4
```

## Troubleshooting

### Common Issues

1. **"pywhatkit not available"**
   - Install pywhatkit: `pip install pywhatkit==5.4`
   - Verify installation: `python test_pywhatkit.py`

2. **"Chrome not found"**
   - Install Google Chrome browser
   - Ensure Chrome is in system PATH

3. **"WhatsApp Web not accessible"**
   - Open WhatsApp Web manually in Chrome
   - Scan QR code if needed
   - Keep the tab open during messaging

4. **"Messages not sending"**
   - Check internet connection
   - Verify WhatsApp Web is logged in
   - Ensure phone numbers are valid

### Testing

Run the test script to verify everything is working:
```bash
python test_pywhatkit.py
```

## Security Considerations

- **Phone Numbers**: Stored securely in database
- **Message Content**: No sensitive data in messages
- **Rate Limiting**: Built-in delays prevent spam
- **Authorization**: Only school admins can send bulk messages

## Performance

- **Scalability**: Can handle hundreds of messages
- **Memory Usage**: Minimal memory footprint
- **Processing Time**: ~2 minutes per message (due to delays)
- **Reliability**: High success rate with proper setup

## Monitoring

The system provides detailed logging:
- Message scheduling status
- Success/failure counts
- Error details for failed messages
- Scheduled delivery times

## Support

For issues or questions:
1. Check the logs in the console output
2. Run the test script to diagnose problems
3. Verify Chrome and WhatsApp Web setup
4. Contact system administrator for assistance

## Future Enhancements

- **Message Templates**: Customizable message formats
- **Delivery Reports**: Real-time delivery status
- **Batch Processing**: Multiple date ranges
- **Analytics**: Message delivery statistics
- **Retry Logic**: Automatic retry for failed messages


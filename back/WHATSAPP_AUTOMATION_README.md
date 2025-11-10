# WhatsApp Automation System

A comprehensive system for automatically sending bulk WhatsApp messages to students with absences using Python, Selenium, and WhatsApp Web.

## 🚀 Features

- **Automated WhatsApp Messaging**: Send bulk messages to students' parents about absences
- **Smart Contact Detection**: Automatically finds and opens WhatsApp chats
- **Customizable Messages**: Support for personalized message templates
- **Absence Statistics**: View detailed statistics about student absences
- **Web Interface**: Easy-to-use web interface for sending messages
- **API Integration**: RESTful API endpoints for programmatic access
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Built-in delays to avoid WhatsApp rate limits

## 📋 Requirements

### System Requirements
- Python 3.7 or higher
- Google Chrome browser
- Internet connection
- WhatsApp account

### Python Dependencies
- `selenium==4.15.2`
- `webdriver-manager==4.0.1`
- `python-dotenv==1.0.0`
- `chromedriver-autoinstaller==0.6.2`

## 🛠️ Installation

### 1. Quick Setup
```bash
# Navigate to the backend directory
cd back

# Run the setup script
python setup_whatsapp.py

# Test the installation
python test_whatsapp.py
```

### 2. Manual Setup
```bash
# Install dependencies
pip install -r requirements_whatsapp.txt

# Test the setup
python test_whatsapp.py
```

## 🎯 Usage

### Web Interface

1. **Start the Flask application**:
   ```bash
   python run.py
   ```

2. **Open WhatsApp Web** in Chrome browser and scan QR code

3. **Navigate to the WhatsApp Messaging page** in the web interface

4. **Configure settings**:
   - Select school (for admins)
   - Choose days to look back for absences
   - Customize message template (optional)

5. **Send messages** by clicking the "إرسال الإشعارات" button

### API Usage

#### Send Absence Notifications
```http
POST /api/auth/send-absence-notifications
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "school_id": 1,
  "days_back": 7,
  "custom_message": "مرحباً {name}، لديك غياب في المدرسة."
}
```

#### Get Absence Statistics
```http
GET /api/auth/get-absence-stats?school_id=1&days_back=7
Authorization: Bearer <your-token>
```

### Python Script Usage

```python
from whatsapp_automation import AbsenceMessagingService

# Initialize service
service = AbsenceMessagingService()

# Send absence notifications
results = service.send_absence_notifications(
    school_id=None,  # Optional: specific school
    days_back=7,     # Look back 7 days
    custom_message=None  # Optional: custom message
)

print(f"Results: {results}")
```

## 📱 Message Templates

### Default Template
```
مرحباً {name}،

نود إعلامكم بأن الطالب/ة لديه غيابات في الأيام الماضية.

نرجو منكم التواصل مع المدرسة لمعرفة أسباب الغياب واتخاذ الإجراءات اللازمة.

شكراً لتعاونكم.

المدرسة
```

### Custom Template
You can create custom messages using the `{name}` placeholder for student names.

## 🔧 Configuration

### WhatsApp Automation Settings

```python
# In whatsapp_automation.py
class WhatsAppAutomation:
    def __init__(self, headless=False):
        # Set headless=True for production (no browser window)
        self.headless = headless
```

### Message Delays
```python
# Delay between messages (in seconds)
time.sleep(3)  # 3 seconds between each message
```

## 📊 Statistics

The system provides detailed statistics including:

- Total students with absences
- Students with phone numbers
- Total absence records
- Absence distribution by count
- Days checked

## 🛡️ Security & Privacy

### Important Notes
- **Never share your WhatsApp session**
- **Use responsibly and respect privacy laws**
- **Test with a small group first**
- **Keep your WhatsApp account secure**

### Data Protection
- Phone numbers are only used for messaging
- No personal data is stored permanently
- Messages are sent directly through WhatsApp Web

## 🐛 Troubleshooting

### Common Issues

1. **Chrome not found**
   - Install Google Chrome browser
   - Ensure Chrome is in your system PATH

2. **ChromeDriver issues**
   - The script downloads ChromeDriver automatically
   - If issues persist, update Chrome browser

3. **WhatsApp Web not loading**
   - Check internet connection
   - Clear browser cache and cookies
   - Try incognito mode

4. **QR code not scanning**
   - Ensure WhatsApp is installed on your phone
   - Check phone's internet connection
   - Try refreshing the page

5. **Messages not sending**
   - Verify contacts exist in WhatsApp
   - Check if phone numbers are in correct format
   - Ensure WhatsApp Web is properly logged in

6. **Rate limiting**
   - The system includes built-in delays
   - If still limited, increase delay between messages
   - Avoid sending too many messages at once

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📝 API Reference

### Endpoints

#### Send Absence Notifications
- **URL**: `/api/auth/send-absence-notifications`
- **Method**: `POST`
- **Auth**: Required (JWT token)
- **Body**:
  ```json
  {
    "school_id": 1,
    "days_back": 7,
    "custom_message": "Custom message template"
  }
  ```

#### Get Absence Statistics
- **URL**: `/api/auth/get-absence-stats`
- **Method**: `GET`
- **Auth**: Required (JWT token)
- **Query Parameters**:
  - `school_id`: School ID (optional)
  - `days_back`: Days to look back (default: 7)

### Response Format

#### Success Response
```json
{
  "message": "تم إرسال 5 رسالة بنجاح من أصل 5",
  "total": 5,
  "sent": 5,
  "failed": 0,
  "failed_contacts": []
}
```

#### Error Response
```json
{
  "message": "فشل في فتح WhatsApp Web. يرجى التأكد من مسح رمز QR",
  "error": true
}
```

## 🔄 Workflow

1. **Setup**: Install dependencies and test setup
2. **Authentication**: Login to WhatsApp Web
3. **Configuration**: Set school, days, and message template
4. **Statistics**: Review absence statistics
5. **Sending**: Send bulk messages with progress tracking
6. **Results**: Review success/failure results

## 📈 Performance

### Optimization Tips
- Use headless mode for production
- Increase delays if experiencing rate limits
- Process messages in smaller batches
- Monitor system resources during bulk sending

### Limitations
- WhatsApp Web session timeout (24 hours)
- Rate limiting by WhatsApp
- Browser resource usage
- Internet connection dependency

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Test with the provided test script
4. Ensure all requirements are met

## 📄 License

This system is part of the TatubuJS project and follows the same licensing terms.

---

**⚠️ Disclaimer**: This system is for educational and legitimate business purposes only. Users are responsible for complying with WhatsApp's Terms of Service and applicable laws regarding automated messaging.













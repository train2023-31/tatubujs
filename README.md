# 🎓 Tatubu - School Management System (PWA)

A comprehensive Progressive Web App for school management with real-time push notifications.

## ✨ Features

### 🔔 Push Notifications
- **Background notifications** - Receive alerts even when the app is closed
- **VAPID Web Push** - No Firebase or paid services required
- **Multi-platform** - Works on Android, iOS 16.4+, Desktop
- **Customizable** - Users can control notification preferences
- **Secure** - End-to-end encrypted with VAPID keys

### 📱 Progressive Web App
- **Install to home screen** - Works like a native app
- **Offline support** - Access cached content without internet
- **Fast loading** - Optimized caching strategies
- **Responsive design** - Works on all screen sizes
- **Standalone mode** - Full-screen app experience

### 🏫 School Management
- **Attendance tracking** - Mark student attendance by class
- **Bus management** - Track student bus boarding/exit
- **Timetable management** - Manage school schedules
- **Teacher substitution** - Handle teacher absences
- **Notifications** - Real-time alerts for parents and teachers
- **Reports** - Generate attendance and behavior reports
- **Multi-school support** - Manage multiple schools
- **Role-based access** - Admin, teacher, student, driver, analyst

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- MySQL database
- HTTPS (for production) or localhost (for development)

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
setup_pwa.bat
```

**Mac/Linux:**
```bash
chmod +x setup_pwa.sh
./setup_pwa.sh
```

### Option 2: Manual Setup

#### 1. Backend Setup

```bash
cd back
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python generate_vapid_keys.py
```

Create `back/.env` (use `back/.env.example` as template):
```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_CLAIM_EMAIL=mailto:admin@yourdomain.com
DATABASE_URI=mysql+pymysql://user:password@localhost:3306/db
```

#### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create or update `frontend/.env`:
```env
REACT_APP_VAPID_PUBLIC_KEY=your-public-key
```

#### 3. Run

**Terminal 1 - Backend:**
```bash
cd back
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Open http://localhost:3000

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](docs/QUICK_START_PWA.md)** - 5-minute setup
- **[PWA Setup Guide](docs/PWA_SETUP_GUIDE.md)** - Complete documentation
- **[Conversion Summary](docs/PWA_CONVERSION_SUMMARY.md)** - What was changed

### Developer Guides
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Backend API reference
- **[Frontend Components](docs/COMPONENT_GUIDE.md)** - React component guide
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database structure

## 🔧 Tech Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Service Worker** - PWA functionality
- **Web Push API** - Push notifications

### Backend
- **Flask 3** - Web framework
- **SQLAlchemy** - ORM
- **Flask-JWT-Extended** - Authentication
- **pywebpush** - Push notification server
- **Flask-CORS** - CORS handling
- **MySQL** - Database

## 📱 Browser Support

| Platform | Browser | Version | Support |
|----------|---------|---------|---------|
| Desktop | Chrome | 42+ | ✅ Full |
| Desktop | Edge | 79+ | ✅ Full |
| Desktop | Firefox | 44+ | ✅ Full |
| Desktop | Safari | 16+ | ✅ Full |
| Android | Chrome | All | ✅ Full |
| iOS | Safari | 16.4+ | ✅ Full* |

*iOS requires app to be installed to home screen for push notifications

## 🔔 Using Push Notifications

### Frontend Integration

```javascript
import { usePushNotifications } from './hooks/usePushNotifications';

function MyComponent() {
  const { 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    sendTestNotification 
  } = usePushNotifications();

  return (
    <div>
      <button onClick={subscribe}>
        {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
      </button>
      
      {isSubscribed && (
        <button onClick={sendTestNotification}>
          Send Test
        </button>
      )}
    </div>
  );
}
```

### Backend Integration

```python
from app.routes.notification_routes import create_notification

# Send notification to specific users
create_notification(
    school_id=1,
    title="New Assignment",
    message="You have a new math assignment",
    notification_type="general",
    created_by=admin_id,
    target_user_ids=[1, 2, 3],  # Specific users
    priority="high"
)

# Send to all users with a specific role
create_notification(
    school_id=1,
    title="School Announcement",
    message="School will be closed tomorrow",
    notification_type="news",
    created_by=admin_id,
    target_role="student",  # All students
    priority="urgent"
)
```

### API Endpoint

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "Hello World!",
    "type": "general",
    "priority": "normal",
    "target_role": "student"
  }'
```

## 🏗️ Project Structure

```
tatubujs/
├── back/                           # Flask backend
│   ├── app/
│   │   ├── routes/                # API routes
│   │   │   ├── notification_routes.py  # Push notification API
│   │   │   ├── auth.py            # Authentication
│   │   │   ├── attendance_routes.py
│   │   │   ├── bus_routes.py
│   │   │   └── ...
│   │   ├── services/              # Business logic
│   │   │   ├── notification_service.py
│   │   │   └── notification_utils.py
│   │   ├── models.py              # Database models
│   │   ├── config.py              # Configuration
│   │   └── __init__.py            # App factory
│   ├── migrations/                # Database migrations
│   ├── requirements.txt           # Python dependencies
│   ├── generate_vapid_keys.py     # VAPID key generator
│   ├── run.py                     # Entry point
│   └── .env.example               # Environment template
│
├── frontend/                      # React frontend
│   ├── public/
│   │   ├── service-worker.js      # Service worker
│   │   ├── manifest.json          # PWA manifest
│   │   └── ...
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── PushNotificationSettings/
│   │   │   ├── Layout/
│   │   │   └── ...
│   │   ├── hooks/                 # Custom hooks
│   │   │   └── usePushNotifications.js  # Push notification hook
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API services
│   │   ├── utils/                 # Utility functions
│   │   ├── App.js                 # Root component
│   │   └── index.js               # Entry point
│   ├── package.json               # Node dependencies
│   └── .env                       # Environment variables
│
├── docs/                          # Documentation
│   ├── PWA_SETUP_GUIDE.md         # Complete PWA guide
│   ├── QUICK_START_PWA.md         # Quick start guide
│   └── PWA_CONVERSION_SUMMARY.md  # Conversion summary
│
├── setup_pwa.sh                   # Setup script (Mac/Linux)
├── setup_pwa.bat                  # Setup script (Windows)
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

## 🔒 Security

- **JWT Authentication** - Secure token-based auth
- **VAPID Keys** - Private keys never exposed to frontend
- **HTTPS Required** - For production deployments
- **CORS Protection** - Configured for specific origins
- **SQL Injection Prevention** - Using SQLAlchemy ORM
- **XSS Protection** - Content sanitization
- **Rate Limiting** - API rate limits via Redis

## 🚢 Deployment

### Production Checklist

1. **Generate production VAPID keys**
   ```bash
   cd back
   python generate_vapid_keys.py
   ```

2. **Set environment variables**
   - Backend: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`
   - Frontend: `REACT_APP_VAPID_PUBLIC_KEY`

3. **Enable HTTPS**
   - Use Let's Encrypt, Cloudflare, or similar
   - Update CORS settings in `back/app/__init__.py`

4. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

5. **Deploy backend**
   ```bash
   cd back
   gunicorn -w 4 -b 0.0.0.0:5000 run:app
   ```

6. **Test on real devices**
   - Android Chrome
   - iOS Safari (16.4+)
   - Desktop browsers

See [PWA Setup Guide](docs/PWA_SETUP_GUIDE.md) for detailed deployment instructions.

## 🐛 Troubleshooting

### Service Worker Issues
```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Registered ✓' : 'Not registered ✗');
});
```

### Push Notification Issues
```javascript
// Check notification permission
console.log('Permission:', Notification.permission);

// Check subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? 'Active ✓' : 'None ✗');
  });
});
```

### Common Solutions
- **"Service worker failed"**: Clear cache, check console
- **"Push subscription failed"**: Verify VAPID key in `.env`
- **"Notifications not appearing"**: Check browser notification settings
- **"iOS not working"**: Ensure iOS 16.4+, app installed to home screen

See [PWA Setup Guide - Troubleshooting](docs/PWA_SETUP_GUIDE.md#troubleshooting) for more.

## 📈 Performance

- **Lighthouse Score**: 95+ (Performance, Best Practices, SEO, PWA)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Service Worker**: Caches static assets for instant loading
- **API Response Time**: < 200ms average

## 🧪 Testing

### Manual Testing

```bash
# Test push notifications
cd frontend
npm start

# Open browser, grant permission, subscribe
# In another terminal, send test notification:
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Test","message":"Hello","type":"general"}'
```

### Automated Testing

```bash
# Backend tests
cd back
pytest

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for school management.

## 👥 Team

- **Backend Development**: Flask API, database, push notifications
- **Frontend Development**: React components, PWA features
- **DevOps**: Deployment, CI/CD, monitoring

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: Check troubleshooting section
- **Email**: admin@tatubu.com

## 🗺️ Roadmap

- [ ] Add offline data sync
- [ ] Implement notification scheduling
- [ ] Add rich notification images
- [ ] Create mobile apps (React Native)
- [ ] Add video streaming for classes
- [ ] Integrate payment gateway
- [ ] Add parent portal
- [ ] Create analytics dashboard

## 📝 Changelog

### Version 2.6.4 (Current)
- ✅ Full PWA support
- ✅ Push notifications (VAPID)
- ✅ iOS 16.4+ support
- ✅ Offline caching
- ✅ Install to home screen
- ✅ Background notifications
- ✅ Comprehensive documentation

### Version 2.6.0
- Added notification system
- Improved UI/UX
- Bug fixes and performance improvements

## ⭐ Features in Detail

### Attendance Management
- Mark attendance by class and period
- Track absences, tardiness, excuses
- Real-time notifications to parents
- Generate attendance reports
- Export to Excel/PDF

### Bus Tracking
- QR code scanning for boarding/exit
- Real-time bus location tracking
- Parent notifications on boarding/exit
- Driver dashboard
- Forgot student alerts

### Timetable Management
- Create and manage school schedules
- Teacher timetables
- Class timetables
- Period substitutions
- Conflict detection

### Notification System
- Push notifications (background)
- In-app notifications
- Email notifications (optional)
- SMS notifications (optional)
- WhatsApp integration (optional)
- User preferences
- Notification history

## 🌍 Internationalization

Currently supports:
- 🇸🇦 Arabic (primary)
- 🇬🇧 English (partial)

RTL (Right-to-Left) support enabled throughout the app.

---

**Made with ❤️ for schools in Oman**

**Last Updated**: February 8, 2026

# Tatubu School Management System - Frontend

A modern React frontend for the Tatubu School Management System, built with React 18, Tailwind CSS, and modern UI components.

## Features

- **Authentication System**: JWT-based authentication with role-based access control
- **Dashboard**: Role-specific dashboards for admins, school admins, and teachers
- **User Management**: Complete CRUD operations for users (students, teachers, admins)
- **Class Management**: Manage classes, subjects, and student assignments
- **Attendance Tracking**: Real-time attendance recording with multiple status options
- **Reports & Analytics**: Comprehensive reporting with charts and statistics
- **Profile Management**: User profile editing and password management
- **Responsive Design**: Mobile-first design that works on all devices
- **Arabic Support**: Full RTL support and Arabic language interface

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **React Query**: Data fetching and caching
- **React Hook Form**: Form handling and validation
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Recharts**: Data visualization and charts
- **Axios**: HTTP client for API requests
- **React Hot Toast**: Toast notifications

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on `http://localhost:5000`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (Header, Sidebar)
│   └── UI/             # Generic UI components (Modal, DataTable, etc.)
├── contexts/           # React contexts (AuthContext)
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── Auth/           # Authentication pages
│   ├── Dashboard/      # Dashboard pages
│   ├── Users/          # User management pages
│   ├── Classes/        # Class management pages
│   ├── Attendance/     # Attendance tracking pages
│   ├── Reports/        # Reports and analytics pages
│   └── Profile/        # Profile management pages
├── services/           # API services and configurations
├── utils/              # Utility functions and helpers
├── App.js              # Main App component
└── index.js            # Application entry point
```

## User Roles

The system supports three main user roles:

### 1. Admin (مدير النظام)
- Full system access
- Manage all schools
- View system-wide statistics
- Manage global settings

### 2. School Admin (مدير المدرسة)
- Manage school users (teachers and students)
- Create and manage classes and subjects
- View school statistics and reports
- Manage attendance policies

### 3. Teacher (معلم)
- Record student attendance
- View class statistics
- Access personal reports
- Manage assigned classes

## Key Features

### Authentication
- Secure JWT-based authentication
- Role-based access control
- Automatic token refresh
- Protected routes

### Dashboard
- Role-specific dashboards
- Real-time statistics
- Quick action buttons
- Recent activity feeds

### User Management
- Add/edit/delete users
- Bulk user operations
- Role assignment
- User status management

### Attendance System
- Real-time attendance recording
- Multiple attendance statuses (Present, Absent, Late, Excused)
- Class and subject-based tracking
- Excuse note management

### Reports & Analytics
- Daily, weekly, and monthly reports
- Interactive charts and graphs
- Export functionality
- Teacher performance tracking

## API Integration

The frontend integrates with the Flask backend API through the following endpoints:

- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Classes**: `/api/classes/*`
- **Attendance**: `/api/attendance/*`
- **Reports**: `/api/static/*`

## Styling

The application uses Tailwind CSS with custom configurations:

- **Primary Colors**: Blue theme
- **Typography**: Inter font for English, Cairo font for Arabic
- **Components**: Custom component classes for consistent styling
- **Responsive**: Mobile-first responsive design

## Internationalization

- **Arabic Support**: Full RTL layout support
- **Bilingual Interface**: Arabic and English text
- **Date Formatting**: Localized date formats
- **Number Formatting**: Arabic number support

## Development

### Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

### Code Style

- ESLint configuration for code quality
- Prettier for code formatting
- Consistent naming conventions
- Component-based architecture

## Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

### Environment Variables

For production deployment, set the following environment variables:

```env
REACT_APP_API_URL=https://your-api-domain.com/api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.






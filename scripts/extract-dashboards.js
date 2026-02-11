const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Dashboard');
const content = fs.readFileSync(path.join(basePath, 'Dashboard.js'), 'utf8');
const lines = content.split('\n');

// SchoolAdminDashboard
const schoolAdminImports = `import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardList, Calendar, UserCheck, Clock, FileText,
  AlertCircle, Eye, EyeOff, CheckCircle, Settings, Phone, MessageCircle,
  BarChart3, Bus, User, QrCode, Upload, TrendingUp
} from 'lucide-react';
import { attendanceAPI, busAPI } from '../../services/api';
import { formatOmanTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import NewsWidget from '../../components/UI/NewsWidget';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

`;

const schoolAdminContent = lines.slice(499, 1757).join('\n');
fs.writeFileSync(path.join(basePath, 'SchoolAdminDashboard.js'), schoolAdminImports + schoolAdminContent + '\n\nexport default SchoolAdminDashboard;\n', 'utf8');
console.log('Created SchoolAdminDashboard.js');

// TeacherDashboard
const teacherImports = `import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Eye, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI, substitutionAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import NewsWidget from '../../components/UI/NewsWidget';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

`;

const teacherContent = lines.slice(1758, 2184).join('\n');
fs.writeFileSync(path.join(basePath, 'TeacherDashboard.js'), teacherImports + teacherContent + '\n\nexport default TeacherDashboard;\n', 'utf8');
console.log('Created TeacherDashboard.js');

// DriverDashboard
const driverImports = `import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, AlertCircle, ArrowRight, ArrowLeft, Bus, User, History, QrCode, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { busAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

`;

const driverContent = lines.slice(2274, 2577).join('\n');
fs.writeFileSync(path.join(basePath, 'DriverDashboard.js'), driverImports + driverContent + '\n\nexport default DriverDashboard;\n', 'utf8');
console.log('Created DriverDashboard.js');

// StudentDashboard
const studentImports = `import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, AlertCircle, ArrowRight, ArrowLeft, Bus, User, History,
  QrCode, MapPin, BarChart3, Calendar, TrendingUp, Clock, CheckCircle, FileText, Star, Eye
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceAPI, busAPI, parentPickupAPI } from '../../services/api';
import { formatDate, formatOmanTime } from '../../utils/helpers';
import { encodeStudentQRPayload } from '../../utils/qrPayload';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatCard from '../../components/Dashboard/StatCard';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

`;

const studentContent = lines.slice(2577, 3806).join('\n');
fs.writeFileSync(path.join(basePath, 'StudentDashboard.js'), studentImports + studentContent + '\n\nexport default StudentDashboard;\n', 'utf8');
console.log('Created StudentDashboard.js');

console.log('All dashboard files created successfully!');

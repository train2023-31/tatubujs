from app import db
from datetime import datetime, timezone
from app.config import get_oman_time

# Base User model
class User(db.Model):
    __tablename__ = 'users'  # Changed from 'user' to 'users'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    fullName = db.Column(db.String(255), nullable=False)
    user_role = db.Column(db.String(50))  # Changed 'role' to 'user_role'
    phone_number = db.Column(db.String(20))
    email = db.Column(db.String(100), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)

    __mapper_args__ = {
        'polymorphic_identity': 'user',
        'polymorphic_on': type
    }
    def to_dict(self):
        """Serialize User object to dictionary."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "fullName": self.fullName,
            "phone_number": self.phone_number,
            "role": self.user_role,
            "is_active": self.is_active,
            "school_id": self.school_id,
        }

class Student(User):
    __tablename__ = 'students'  # Changed from 'student' to 'students'
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)  # Updated foreign key reference
    
    # Student-specific fields
    behavior_note = db.Column(db.Text, nullable=True)  # General note for student behavior
    location = db.Column(db.String(255), nullable=True)  # المنطقة السكنية (Residential Area)

    # Relationships
    school = db.relationship('School', back_populates='students')
    classes = db.relationship('Class', secondary='student_classes', back_populates='students')
    attendances = db.relationship('Attendance', back_populates='student')
    buses = db.relationship('Bus', secondary='bus_students', back_populates='students')

    __mapper_args__ = {
        'polymorphic_identity': 'student',
    }
    def to_dict(self):
        """Serialize Student object to dictionary."""
        data = super().to_dict()
        data.update({
            "location": self.location  # المنطقة السكنية
        })
        return data

class Teacher(User):
    __tablename__ = 'teachers'  # Changed from 'teacher' to 'teachers'
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)  # Updated foreign key reference
    salary = db.Column(db.Float, nullable=True)
    week_Classes_Number = db.Column(db.Integer, nullable=True)
    job_name = db.Column(db.String(100), nullable=True)  # New column for job title

    # Relationships
    school = db.relationship('School', back_populates='teachers')
    classes = db.relationship('Class', back_populates='teacher')
    attendances = db.relationship('Attendance', back_populates='teacher')
    subject = db.relationship('Subject', back_populates='teacher')

    __mapper_args__ = {
        'polymorphic_identity': 'teacher',
    }

    def to_dict(self):
        """Serialize Teacher object to dictionary."""
        data = super().to_dict()
        data.update({
            "salary": self.salary,
            "week_Classes_Number": self.week_Classes_Number,
            "job_name": self.job_name  # Include job_name in serialization
        })
        return data


class Driver(User):
    __tablename__ = 'drivers'
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    
    # Driver-specific fields
    license_number = db.Column(db.String(100), nullable=True)
    license_expiry = db.Column(db.Date, nullable=True)
    
    # Relationships
    school = db.relationship('School', backref='drivers')
    bus = db.relationship('Bus', back_populates='driver', uselist=False)  # One driver, one bus
    
    __mapper_args__ = {
        'polymorphic_identity': 'driver',
    }
    
    def to_dict(self):
        """Serialize Driver object to dictionary."""
        data = super().to_dict()
        data.update({
            "license_number": self.license_number,
            "license_expiry": self.license_expiry.isoformat() if self.license_expiry else None,
            "bus_id": self.bus.id if self.bus else None,
            "bus_number": self.bus.bus_number if self.bus else None,
        })
        return data


class School(db.Model):
    __tablename__ = 'schools'  # Changed from 'school' to 'schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255))
    phone_number = db.Column(db.String(20))
    password = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    # iBulk SMS Configuration Fields
    ibulk_sms_enabled = db.Column(db.Boolean, nullable=False, default=False)
    ibulk_username = db.Column(db.String(100), nullable=True)
    ibulk_password = db.Column(db.String(255), nullable=True)
    ibulk_sender_id = db.Column(db.String(11), nullable=True)  # Max 11 characters alphanumeric
    ibulk_api_url = db.Column(db.String(255), nullable=True, default='https://ismartsms.net/RestApi/api/SMS/PostSMS')
    ibulk_balance_threshold = db.Column(db.Float, nullable=True, default=10.0)  # Minimum balance threshold
    ibulk_last_balance_check = db.Column(db.DateTime, nullable=True)
    ibulk_current_balance = db.Column(db.Float, nullable=True, default=0.0)

    # Relationships
    students = db.relationship('Student', back_populates='school', lazy='dynamic')
    teachers = db.relationship('Teacher', back_populates='school', lazy='dynamic')
    classes = db.relationship('Class', back_populates='school', lazy='dynamic')
    subject = db.relationship('Subject', back_populates='school')


    def to_dict(self):
        """Serialize School object to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "phone_number": self.phone_number,
            "is_active": self.is_active,
            "ibulk_sms_enabled": self.ibulk_sms_enabled,
            "ibulk_username": self.ibulk_username,
            "ibulk_sender_id": self.ibulk_sender_id,
            "ibulk_current_balance": self.ibulk_current_balance,
            "ibulk_last_balance_check": self.ibulk_last_balance_check.isoformat() if self.ibulk_last_balance_check else None
        }

class Class(db.Model):
    __tablename__ = 'classes'  # Changed from 'class' to 'classes'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # Relationships
    school = db.relationship('School', back_populates='classes')
    teacher = db.relationship('Teacher', back_populates='classes')
    students = db.relationship('Student', secondary='student_classes', back_populates='classes')
    attendances = db.relationship('Attendance', back_populates='class_obj')

    def to_dict(self):
        """Serialize Class object to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "school_id": self.school_id,
            "teacher_id": self.teacher_id,
            "is_active": self.is_active
            # Add more class-specific fields if necessary
        }
    


    
student_classes = db.Table('student_classes',
    db.Column('student_id', db.Integer, db.ForeignKey('students.id'), primary_key=True),
    db.Column('class_id', db.Integer, db.ForeignKey('classes.id'), primary_key=True)
)


    
class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)

    # Relationships
    attendances = db.relationship('Attendance', back_populates='subject')  # Fixed property name
    teacher = db.relationship('Teacher', back_populates='subject')
    school = db.relationship('School', back_populates='subject')

    def to_dict(self):
        """Serialize Subject object to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "school_id": self.school_id,
            "teacher_id": self.teacher_id,
            "is_active": self.is_active
        }


class Attendance(db.Model):
    __tablename__ = 'attendances'  # Changed from 'attendance' to 'attendances'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, nullable=False, default=get_oman_time().utcnow)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    class_time_num = db.Column(db.Integer, nullable=False)
    is_present = db.Column(db.Boolean, nullable=False, default=True)
    is_Acsent = db.Column(db.Boolean, nullable=False, default=False)
    is_Excus = db.Column(db.Boolean, nullable=False, default=False)
    is_late = db.Column(db.Boolean, nullable=False, default=False)
    ExcusNote = db.Column(db.String(255))
    is_has_exuse = db.Column(db.Boolean, nullable=False, default=False)

    # Relationships
    student = db.relationship('Student', back_populates='attendances')
    teacher = db.relationship('Teacher', back_populates='attendances')
    class_obj = db.relationship('Class', back_populates='attendances')
    subject = db.relationship('Subject', back_populates='attendances')

     # Add a unique constraint
    __table_args__ = (
        db.UniqueConstraint('student_id', 'class_id', 'date', 'class_time_num', 'subject_id', name='unique_attendance_record'),
    )

    def to_dict(self):
        """Serialize Attendance object to dictionary."""
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "student_id": self.student_id,
            "teacher_id": self.teacher_id,
            "class_id": self.class_id,
            "subject_id": self.subject_id,
            "is_present": self.is_present,
            "is_Excus": self.is_Excus,
            "is_Acsent": self.is_Acsent,
            "ExcusNote": self.ExcusNote
            # Add more attendance-specific fields if necessary
        }



class News(db.Model):
    __tablename__ = 'news'

    id = db.Column(db.Integer, primary_key=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'global' or 'school'
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    end_at = db.Column(db.DateTime, nullable=True)  # New field

    # Relationships
    creator = db.relationship('User', backref='news_items')
    school = db.relationship('School', backref='news')

    def to_dict(self):
        return {
            'id': self.id,
            'created_by': self.created_by,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'is_active': self.is_active,
            'school_id': self.school_id,
            'created_at': self.created_at.isoformat(),
            'end_at': self.end_at.isoformat() if self.end_at else None
        }
    


class ConformAtt(db.Model):
    __tablename__ = 'conform_att'

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    is_confirm = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    updated_at = db.Column(db.DateTime, default=get_oman_time().utcnow, onupdate=get_oman_time().utcnow)

    # Relationships
    school = db.relationship('School', backref='confirmations')

    def to_dict(self):
        return {
            'id': self.id,
            'school_id': self.school_id,
            'date': self.date.isoformat(),
            'is_confirm': self.is_confirm,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ActionLog(db.Model):
    __tablename__ = 'action_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action_type = db.Column(db.String(100), nullable=False)
    endpoint = db.Column(db.String(255), nullable=False)
    content = db.Column(db.String(255), nullable=False)
    method = db.Column(db.String(10))
    ip_address = db.Column(db.String(100), nullable=True)
    mac_address = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=get_oman_time().utcnow)
    status_code = db.Column(db.Integer)


# Association table for students and buses
bus_students = db.Table('bus_students',
    db.Column('student_id', db.Integer, db.ForeignKey('students.id'), primary_key=True),
    db.Column('bus_id', db.Integer, db.ForeignKey('buses.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=get_oman_time().utcnow)
)


# Bus Model
class Bus(db.Model):
    __tablename__ = 'buses'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_number = db.Column(db.String(50), nullable=False)
    bus_name = db.Column(db.String(100), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True, unique=True)  # Changed to drivers.id and added unique
    capacity = db.Column(db.Integer, nullable=False, default=50)
    plate_number = db.Column(db.String(50), nullable=True)
    location = db.Column(db.String(255), nullable=True)  # موقع الحافلة (Bus Location)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    
    # Relationships
    school = db.relationship('School', backref='buses')
    driver = db.relationship('Driver', back_populates='bus')  # Changed relationship
    students = db.relationship('Student', secondary='bus_students', back_populates='buses')
    scans = db.relationship('BusScan', back_populates='bus', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_number': self.bus_number,
            'bus_name': self.bus_name,
            'school_id': self.school_id,
            'driver_id': self.driver_id,
            'driver_name': self.driver.fullName if self.driver else None,
            'capacity': self.capacity,
            'plate_number': self.plate_number,
            'location': self.location,
            'is_active': self.is_active,
            'student_count': len(self.students),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Bus Scan/Tracking Model
class BusScan(db.Model):
    __tablename__ = 'bus_scans'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    bus_id = db.Column(db.Integer, db.ForeignKey('buses.id'), nullable=False)
    scan_type = db.Column(db.String(20), nullable=False)  # 'board' or 'exit'
    scan_time = db.Column(db.DateTime, nullable=False, default=lambda: get_oman_time())
    location = db.Column(db.String(255), nullable=True)
    scanned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    student = db.relationship('Student', foreign_keys=[student_id], backref='bus_scans')
    bus = db.relationship('Bus', back_populates='scans')
    scanner = db.relationship('User', backref='scans_performed', foreign_keys=[scanned_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.fullName if self.student else None,
            'student_username': self.student.username if self.student else None,
            'bus_id': self.bus_id,
            'bus_number': self.bus.bus_number if self.bus else None,
            'scan_type': self.scan_type,
            'scan_time': self.scan_time.isoformat() if self.scan_time else None,
            'location': self.location,
            'scanned_by': self.scanned_by,
            'scanner_name': self.scanner.fullName if self.scanner else None,
            'notes': self.notes
        }

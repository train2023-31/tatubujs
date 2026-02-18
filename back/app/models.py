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
    behavior_note = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)  # ??????? ??????? (Residential Area)
    # 6-digit PIN for parent login (hashed). Set on first parent login after phone verification.
    parent_pin_hash = db.Column(db.String(255), nullable=True)
    # Lock parent login after 5 failed attempts; school must unlock
    parent_failed_attempts = db.Column(db.Integer, nullable=False, default=0)
    parent_locked_until = db.Column(db.DateTime, nullable=True)

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
        # Add more student-specific fields if necessary
        data.update({
            "location": self.location  # ??????? ???????
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
        


class ParentPickup(db.Model):
    __tablename__ = 'parent_pickups'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    parent_phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, confirmed, completed
    request_time = db.Column(db.DateTime(timezone=True), nullable=False)
    confirmation_time = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_time = db.Column(db.DateTime(timezone=True), nullable=True)
    pickup_date = db.Column(db.Date, nullable=False)  # Date of pickup for filtering
    
    # Relationships
    student = db.relationship('Student', backref='pickup_requests')
    school = db.relationship('School', backref='pickup_requests')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.fullName if self.student else None,
            'student_username': self.student.username if self.student else None,
            'parent_phone': self.parent_phone,
            'status': self.status,
            'request_time': self.request_time.isoformat() if self.request_time else None,
            'confirmation_time': self.confirmation_time.isoformat() if self.confirmation_time else None,
            'completed_time': self.completed_time.isoformat() if self.completed_time else None,
            'pickup_date': self.pickup_date.isoformat() if self.pickup_date else None
        }
        

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
    ibulk_api_url = db.Column(db.String(255), nullable=True, default='https://ismartsms.net/api/send')
    ibulk_balance_threshold = db.Column(db.Float, nullable=True, default=10.0)  # Minimum balance threshold
    ibulk_last_balance_check = db.Column(db.DateTime, nullable=True)
    ibulk_current_balance = db.Column(db.Float, nullable=True, default=0.0)

    # Evolution API (WhatsApp) Configuration Fields
    evolution_whatsapp_enabled = db.Column(db.Boolean, nullable=False, default=False)
    evolution_api_url = db.Column(db.String(255), nullable=True)
    evolution_api_key = db.Column(db.String(255), nullable=True)
    evolution_instance_name = db.Column(db.String(100), nullable=True)
    evolution_instance_token = db.Column(db.String(255), nullable=True)
    evolution_phone_number = db.Column(db.String(20), nullable=True)
    evolution_instance_status = db.Column(db.String(50), nullable=True, default='disconnected')

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
    date = db.Column(db.Date, nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    is_confirm = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    updated_at = db.Column(db.DateTime, default=get_oman_time().utcnow, onupdate=get_oman_time().utcnow)

    # Relationships
    school = db.relationship('School', backref='conform_att')

    # Add a unique constraint to ensure one confirmation per school per date
    __table_args__ = (
        db.UniqueConstraint('school_id', 'date', name='unique_school_date_confirmation'),
    )

    def to_dict(self):
        """Serialize ConformAtt object to dictionary."""
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "school_id": self.school_id,
            "is_confirm": self.is_confirm,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
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
    location = db.Column(db.String(255), nullable=True) 
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




# Timetable Models
class Timetable(db.Model):
    """Main timetable that holds all schedule information"""
    __tablename__ = 'timetables'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "الفصل الدراسي الأول 2024"
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Who created/uploaded
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    updated_at = db.Column(db.DateTime, default=get_oman_time().utcnow, onupdate=get_oman_time().utcnow)
    
    # Raw XML data (optional - for reference)
    xml_data = db.Column(db.Text, nullable=True)
    
    # Relationships
    school = db.relationship('School', backref='timetables')
    creator = db.relationship('User', backref='timetables_created')
    days = db.relationship('TimetableDay', back_populates='timetable', cascade='all, delete-orphan')
    periods = db.relationship('TimetablePeriod', back_populates='timetable', cascade='all, delete-orphan')
    schedules = db.relationship('TimetableSchedule', back_populates='timetable', cascade='all, delete-orphan')
    teacher_mappings = db.relationship('TimetableTeacherMapping', back_populates='timetable', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'school_id': self.school_id,
            'user_id': self.user_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TimetableDay(db.Model):
    """Days of the week in the timetable"""
    __tablename__ = 'timetable_days'
    
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetables.id'), nullable=False)
    day_id = db.Column(db.String(50), nullable=False)  # ID from XML
    name = db.Column(db.String(50), nullable=False)  # e.g., "الأحد"
    short_name = db.Column(db.String(20), nullable=True)
    
    # Relationships
    timetable = db.relationship('Timetable', back_populates='days')
    
    def to_dict(self):
        return {
            'id': self.id,
            'timetable_id': self.timetable_id,
            'day_id': self.day_id,
            'name': self.name,
            'short_name': self.short_name
        }


class TimetablePeriod(db.Model):
    """Time periods/slots in the timetable"""
    __tablename__ = 'timetable_periods'
    
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetables.id'), nullable=False)
    period_id = db.Column(db.String(50), nullable=False)  # ID from XML
    period_number = db.Column(db.Integer, nullable=False)  # e.g., 1, 2, 3
    start_time = db.Column(db.String(10), nullable=False)  # e.g., "08:00"
    end_time = db.Column(db.String(10), nullable=False)  # e.g., "08:45"
    
    # Relationships
    timetable = db.relationship('Timetable', back_populates='periods')
    
    def to_dict(self):
        return {
            'id': self.id,
            'timetable_id': self.timetable_id,
            'period_id': self.period_id,
            'period_number': self.period_number,
            'start_time': self.start_time,
            'end_time': self.end_time
        }


class TimetableTeacherMapping(db.Model):
    """Mapping between XML teacher names and database teachers"""
    __tablename__ = 'timetable_teacher_mappings'
    
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetables.id'), nullable=False)
    xml_teacher_id = db.Column(db.String(100), nullable=False)  # ID from XML
    xml_teacher_name = db.Column(db.String(255), nullable=False)  # Name from XML
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=True)  # Mapped to real teacher
    
    # Relationships
    timetable = db.relationship('Timetable', back_populates='teacher_mappings')
    teacher = db.relationship('Teacher', backref='timetable_mappings')
    
    __table_args__ = (
        db.UniqueConstraint('timetable_id', 'xml_teacher_id', name='unique_teacher_mapping'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'timetable_id': self.timetable_id,
            'xml_teacher_id': self.xml_teacher_id,
            'xml_teacher_name': self.xml_teacher_name,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.fullName if self.teacher else None
        }


class TimetableSchedule(db.Model):
    """Individual schedule entries (lessons)"""
    __tablename__ = 'timetable_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetables.id'), nullable=False)
    
    # From XML
    class_name = db.Column(db.String(100), nullable=False)
    class_xml_id = db.Column(db.String(100), nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    subject_xml_id = db.Column(db.String(100), nullable=False)
    teacher_xml_id = db.Column(db.String(100), nullable=True)
    classroom_name = db.Column(db.String(100), nullable=True)
    day_xml_id = db.Column(db.String(50), nullable=False)
    period_xml_id = db.Column(db.String(50), nullable=False)
    
    # Relationships
    timetable = db.relationship('Timetable', back_populates='schedules')
    
    def to_dict(self):
        return {
            'id': self.id,
            'timetable_id': self.timetable_id,
            'class_name': self.class_name,
            'class_xml_id': self.class_xml_id,
            'subject_name': self.subject_name,
            'subject_xml_id': self.subject_xml_id,
            'teacher_xml_id': self.teacher_xml_id,
            'classroom_name': self.classroom_name,
            'day_xml_id': self.day_xml_id,
            'period_xml_id': self.period_xml_id
        }



class TeacherSubstitution(db.Model):
    """Records when a teacher is absent and needs substitution"""
    __tablename__ = 'teacher_substitutions'
    
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetables.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    
    # Absent teacher info
    absent_teacher_xml_id = db.Column(db.String(100), nullable=False)  # XML teacher ID
    absent_teacher_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Mapped DB teacher
    absent_teacher_name = db.Column(db.String(255), nullable=False)  # Teacher name from XML
    
    # Date range
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    
    # Distribution criteria (stored as JSON)
    # e.g., ["same_subject", "fewest_classes", "fewest_substitutions", "no_conflict"]
    distribution_criteria = db.Column(db.Text, nullable=True)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    # Relationships
    timetable = db.relationship('Timetable', backref='substitutions')
    assignments = db.relationship('SubstitutionAssignment', back_populates='substitution', cascade='all, delete-orphan')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'timetable_id': self.timetable_id,
            'school_id': self.school_id,
            'absent_teacher_xml_id': self.absent_teacher_xml_id,
            'absent_teacher_user_id': self.absent_teacher_user_id,
            'absent_teacher_name': self.absent_teacher_name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'distribution_criteria': json.loads(self.distribution_criteria) if self.distribution_criteria else [],
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'assignments': [assignment.to_dict() for assignment in self.assignments] if hasattr(self, 'assignments') else []
        }


class SubstitutionAssignment(db.Model):
    """Individual class assignments to substitute teachers"""
    __tablename__ = 'substitution_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    substitution_id = db.Column(db.Integer, db.ForeignKey('teacher_substitutions.id'), nullable=False)
    
    # Original schedule info
    schedule_id = db.Column(db.Integer, db.ForeignKey('timetable_schedules.id'), nullable=False)
    class_name = db.Column(db.String(100), nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    day_xml_id = db.Column(db.String(50), nullable=False)
    period_xml_id = db.Column(db.String(50), nullable=False)
    
    # Substitute teacher info
    substitute_teacher_xml_id = db.Column(db.String(100), nullable=False)  # XML teacher ID
    substitute_teacher_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Mapped DB teacher
    substitute_teacher_name = db.Column(db.String(255), nullable=False)  # Teacher name from XML
    
    # Assignment metadata
    assignment_reason = db.Column(db.Text, nullable=True)  # Why this teacher was selected
    assignment_date = db.Column(db.Date, nullable=True)  # Specific date for this assignment (if different teachers for same day in different weeks)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    
    # Relationships
    substitution = db.relationship('TeacherSubstitution', back_populates='assignments')
    schedule = db.relationship('TimetableSchedule', backref='substitution_assignments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'substitution_id': self.substitution_id,
            'schedule_id': self.schedule_id,
            'class_name': self.class_name,
            'subject_name': self.subject_name,
            'day_xml_id': self.day_xml_id,
            'period_xml_id': self.period_xml_id,
            'substitute_teacher_xml_id': self.substitute_teacher_xml_id,
            'substitute_teacher_user_id': self.substitute_teacher_user_id,
            'substitute_teacher_name': self.substitute_teacher_name,
            'assignment_reason': self.assignment_reason,
            'assignment_date': self.assignment_date.isoformat() if self.assignment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }




# Notification Models
class Notification(db.Model):
    """Notifications sent to users"""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    
    # Notification content
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'attendance', 'bus', 'behavior', 'timetable', 'substitution', 'news', 'general'
    priority = db.Column(db.String(20), nullable=False, default='normal')  # 'low', 'normal', 'high', 'urgent'
    
    # Target users
    target_role = db.Column(db.String(50), nullable=True)  # 'student', 'teacher', 'school_admin', 'analyst', 'driver' or None for specific users
    target_user_ids = db.Column(db.Text, nullable=True)  # JSON array of specific user IDs
    target_class_ids = db.Column(db.Text, nullable=True)  # JSON array of class IDs (for class-specific notifications)
    
    # Related entities (for linking notifications to specific records)
    related_entity_type = db.Column(db.String(50), nullable=True)  # 'attendance', 'bus_scan', 'substitution', 'timetable', 'news', 'behavior'
    related_entity_id = db.Column(db.Integer, nullable=True)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    expires_at = db.Column(db.DateTime, nullable=True)  # Optional expiration
    
    # Action link (optional)
    action_url = db.Column(db.String(500), nullable=True)  # Deep link to specific page
    
    # Relationships
    school = db.relationship('School', backref='notifications')
    creator = db.relationship('User', foreign_keys=[created_by], backref='notifications_created')
    reads = db.relationship('NotificationRead', back_populates='notification', cascade='all, delete-orphan')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'school_id': self.school_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'priority': self.priority,
            'target_role': self.target_role,
            'target_user_ids': json.loads(self.target_user_ids) if self.target_user_ids else None,
            'target_class_ids': json.loads(self.target_class_ids) if self.target_class_ids else None,
            'related_entity_type': self.related_entity_type,
            'related_entity_id': self.related_entity_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'action_url': self.action_url
        }


class NotificationRead(db.Model):
    """Track which users have read which notifications"""
    __tablename__ = 'notification_reads'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.Integer, db.ForeignKey('notifications.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    
    # Relationships
    notification = db.relationship('Notification', back_populates='reads')
    user = db.relationship('User', backref='notification_reads')
    
    __table_args__ = (
        db.UniqueConstraint('notification_id', 'user_id', name='unique_notification_read'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }


class PushSubscription(db.Model):
    """Store push notification subscriptions for PWA (Web Push + FCM)"""
    __tablename__ = 'push_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)  # For FCM targeting
    
    # Web Push API (desktop browsers) - nullable for FCM-only subscriptions
    endpoint = db.Column(db.Text, nullable=True)
    p256dh_key = db.Column(db.Text, nullable=True)  # Public key
    auth_key = db.Column(db.Text, nullable=True)  # Auth secret
    
    # Firebase Cloud Messaging (native mobile) - nullable for Web Push-only
    fcm_token = db.Column(db.String(255), nullable=True, index=True)
    
    # Device info
    device_type = db.Column(db.String(50), nullable=True)  # 'android', 'ios', 'web'
    device_name = db.Column(db.String(255), nullable=True)
    app_version = db.Column(db.String(50), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    last_used_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    # Relationships
    user = db.relationship('User', backref='push_subscriptions')
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'endpoint', name='unique_user_subscription'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'school_id': self.school_id,
            'endpoint': self.endpoint,
            'p256dh_key': self.p256dh_key,
            'auth_key': self.auth_key,
            'fcm_token': self.fcm_token,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'app_version': self.app_version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'is_active': self.is_active
        }



class NotificationDeleted(db.Model):
    """Track which users have deleted which notifications (soft delete per user)"""
    __tablename__ = 'notification_deleted'
    
    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.Integer, db.ForeignKey('notifications.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    deleted_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
    
    # Relationships
    notification = db.relationship('Notification', backref='deletions')
    user = db.relationship('User', backref='deleted_notifications')
    
    __table_args__ = (
        db.UniqueConstraint('notification_id', 'user_id', name='unique_notification_deleted'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }


class NotificationPreference(db.Model):
    """User notification preferences"""
    __tablename__ = 'notification_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Notification type preferences (True = enabled, False = disabled)
    attendance_enabled = db.Column(db.Boolean, nullable=False, default=True)
    bus_enabled = db.Column(db.Boolean, nullable=False, default=True)
    behavior_enabled = db.Column(db.Boolean, nullable=False, default=True)
    timetable_enabled = db.Column(db.Boolean, nullable=False, default=True)
    substitution_enabled = db.Column(db.Boolean, nullable=False, default=True)
    news_enabled = db.Column(db.Boolean, nullable=False, default=True)
    general_enabled = db.Column(db.Boolean, nullable=False, default=True)
    
    # Push notification settings
    push_enabled = db.Column(db.Boolean, nullable=False, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=get_oman_time)
    updated_at = db.Column(db.DateTime, default=get_oman_time, onupdate=get_oman_time)
    
    # Relationships
    user = db.relationship('User', backref='notification_preference')
    
    def to_dict(self):
        try:
            return {
                'id': self.id,
                'user_id': self.user_id,
                'attendance_enabled': bool(self.attendance_enabled) if self.attendance_enabled is not None else True,
                'bus_enabled': bool(self.bus_enabled) if self.bus_enabled is not None else True,
                'behavior_enabled': bool(self.behavior_enabled) if self.behavior_enabled is not None else True,
                'timetable_enabled': bool(self.timetable_enabled) if self.timetable_enabled is not None else True,
                'substitution_enabled': bool(self.substitution_enabled) if self.substitution_enabled is not None else True,
                'news_enabled': bool(self.news_enabled) if self.news_enabled is not None else True,
                'general_enabled': bool(self.general_enabled) if self.general_enabled is not None else True,
                'push_enabled': bool(self.push_enabled) if self.push_enabled is not None else True,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
        except Exception as e:
            import traceback
            print(f"Error in NotificationPreference.to_dict(): {str(e)}")
            print(traceback.format_exc())
            # Return safe defaults
            return {
                'id': getattr(self, 'id', None),
                'user_id': getattr(self, 'user_id', None),
                'attendance_enabled': True,
                'bus_enabled': True,
                'behavior_enabled': True,
                'timetable_enabled': True,
                'substitution_enabled': True,
                'news_enabled': True,
                'general_enabled': True,
                'push_enabled': True,
                'created_at': None,
                'updated_at': None
            }
            
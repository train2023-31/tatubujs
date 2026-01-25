from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import TeacherSubstitution, SubstitutionAssignment, TimetableSchedule, Timetable, TimetableTeacherMapping, TimetableDay, User
from datetime import datetime, date, timedelta
import json
from flask_cors import CORS
from app.routes.notification_routes import create_notification
from app.services.notification_service import notify_teacher_substitution

substitution_bp = Blueprint('substitution', __name__, url_prefix='/api/substitutions')
CORS(substitution_bp)

def calculate_substitute_teachers(timetable_id, absent_teacher_xml_id, school_id, criteria, start_date=None, end_date=None):
    """
    Calculate the best substitute teachers for an absent teacher's classes.
    
    Criteria options:
    - same_subject: Prioritize teachers who teach the same subject
    - fewest_classes: Prioritize teachers with fewer weekly classes
    - fewest_substitutions: Prioritize teachers with fewer existing substitutions
    - no_conflict: Must not have schedule conflicts
    
    Args:
        start_date: Optional start date for checking existing assignments in the same period
        end_date: Optional end date for checking existing assignments in the same period
    
    Returns: List of schedules with suggested substitute teachers
    """
    
    # Get all schedules for the absent teacher
    absent_schedules = TimetableSchedule.query.filter_by(
        timetable_id=timetable_id,
        teacher_xml_id=absent_teacher_xml_id
    ).all()
    
    print(f"DEBUG: calculate_substitute_teachers - Found {len(absent_schedules)} schedules for absent_teacher_xml_id: {absent_teacher_xml_id}")
    
    if not absent_schedules:
        return []
    
    # Get all teachers from this timetable
    all_teachers_xml = db.session.query(TimetableSchedule.teacher_xml_id).filter(
        TimetableSchedule.timetable_id == timetable_id,
        TimetableSchedule.teacher_xml_id.isnot(None),
        TimetableSchedule.teacher_xml_id != absent_teacher_xml_id
    ).distinct().all()
    
    available_teachers = [t[0] for t in all_teachers_xml]
    
    # Get teacher mappings to get actual user IDs
    # Note: teacher_id in TimetableTeacherMapping is the same as user_id (Teacher inherits from User)
    teacher_mappings = {
        tm.xml_teacher_id: tm.teacher_id 
        for tm in TimetableTeacherMapping.query.filter_by(timetable_id=timetable_id).all()
    }
    
    # Calculate stats for each teacher
    teacher_stats = {}
    for teacher_xml_id in available_teachers:
        # Count weekly classes
        weekly_classes = TimetableSchedule.query.filter_by(
            timetable_id=timetable_id,
            teacher_xml_id=teacher_xml_id
        ).count()
        
        # Count existing substitutions
        # If start_date and end_date are provided, also check for assignments in the same period
        user_id = teacher_mappings.get(teacher_xml_id)
        substitution_count = 0
        if user_id:
            # Base query for active substitutions
            base_query = SubstitutionAssignment.query.filter_by(
                substitute_teacher_user_id=user_id
            ).join(TeacherSubstitution).filter(
                TeacherSubstitution.is_active == True,
                TeacherSubstitution.end_date >= date.today()
            )
            
            # If dates are provided, also count assignments that overlap with the requested period
            if start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                    
                    # Count assignments that overlap with the requested period
                    # An assignment overlaps if:
                    # - The substitution's date range overlaps with [start, end]
                    # - OR if assignment_date is within [start, end]
                    overlapping_query = base_query.filter(
                        db.or_(
                            # Substitution date range overlaps
                            db.and_(
                                TeacherSubstitution.start_date <= end,
                                TeacherSubstitution.end_date >= start
                            ),
                            # Assignment has specific date within range
                            db.and_(
                                SubstitutionAssignment.assignment_date.isnot(None),
                                SubstitutionAssignment.assignment_date >= start,
                                SubstitutionAssignment.assignment_date <= end
                            )
                        )
                    )
                    substitution_count = overlapping_query.count()
                except ValueError:
                    # Invalid date format, fallback to base query
                    substitution_count = base_query.count()
            else:
                substitution_count = base_query.count()
        
        # Get subjects taught by this teacher
        teacher_subjects = db.session.query(TimetableSchedule.subject_xml_id).filter(
            TimetableSchedule.timetable_id == timetable_id,
            TimetableSchedule.teacher_xml_id == teacher_xml_id
        ).distinct().all()
        teacher_subjects = [s[0] for s in teacher_subjects]
        
        # Get teacher's schedule (day_xml_id, period_xml_id combinations)
        teacher_schedule = db.session.query(
            TimetableSchedule.day_xml_id,
            TimetableSchedule.period_xml_id
        ).filter(
            TimetableSchedule.timetable_id == timetable_id,
            TimetableSchedule.teacher_xml_id == teacher_xml_id
        ).all()
        
        teacher_stats[teacher_xml_id] = {
            'weekly_classes': weekly_classes,
            'substitution_count': substitution_count,
            'subjects': teacher_subjects,
            'schedule': set(teacher_schedule),  # Set of (day, period) tuples
            'user_id': user_id
        }
    
    # Now assign substitute teachers for each absent schedule
    assignments = []
    
    print(f"DEBUG: calculate_substitute_teachers - Processing {len(absent_schedules)} schedules")
    
    for schedule in absent_schedules:
        # Find the best substitute teacher based on criteria
        candidates = []
        
        for teacher_xml_id in available_teachers:
            stats = teacher_stats[teacher_xml_id]
            score = 0
            reasons = []
            
            # Check for schedule conflict (must pass)
            schedule_slot = (schedule.day_xml_id, schedule.period_xml_id)
            if 'no_conflict' in criteria:
                # Check regular schedule conflict
                if schedule_slot in stats['schedule']:
                    continue  # Skip this teacher, they have a conflict
                
                # Also check if teacher already has a substitution assignment at this time slot
                # in the same period (if dates are provided)
                user_id = stats.get('user_id')
                if start_date and end_date and user_id:
                    try:
                        start = datetime.strptime(start_date, '%Y-%m-%d').date()
                        end = datetime.strptime(end_date, '%Y-%m-%d').date()
                        
                        # Check for existing substitution assignments at this day/period
                        existing_assignment = SubstitutionAssignment.query.filter_by(
                            substitute_teacher_user_id=user_id,
                            day_xml_id=schedule.day_xml_id,
                            period_xml_id=schedule.period_xml_id
                        ).join(TeacherSubstitution).filter(
                            TeacherSubstitution.is_active == True,
                            db.or_(
                                # Substitution date range overlaps
                                db.and_(
                                    TeacherSubstitution.start_date <= end,
                                    TeacherSubstitution.end_date >= start
                                ),
                                # Assignment has specific date within range
                                db.and_(
                                    SubstitutionAssignment.assignment_date.isnot(None),
                                    SubstitutionAssignment.assignment_date >= start,
                                    SubstitutionAssignment.assignment_date <= end
                                )
                            )
                        ).first()
                        
                        if existing_assignment:
                            continue  # Skip this teacher, they already have an assignment at this time
                    except ValueError:
                        # Invalid date format, skip this check
                        pass
            
            # Calculate score based on criteria with detailed breakdown
            points_breakdown = {
                'same_subject': 0,
                'fewest_classes': 0,
                'fewest_substitutions': 0,
                'total': 0
            }
            
            if 'same_subject' in criteria:
                if schedule.subject_xml_id in stats['subjects']:
                    points_breakdown['same_subject'] = 100  # High priority
                    score += 100
                    reasons.append('نفس المادة')
            
            if 'fewest_classes' in criteria:
                # Inverse score: fewer classes = higher score
                max_classes = max([s['weekly_classes'] for s in teacher_stats.values()])
                if max_classes > 0:
                    classes_points = (1 - stats['weekly_classes'] / max_classes) * 50
                    points_breakdown['fewest_classes'] = round(classes_points, 1)
                    score += classes_points
                    reasons.append(f'حصص أسبوعية: {stats["weekly_classes"]}')
            
            if 'fewest_substitutions' in criteria:
                # Inverse score: fewer substitutions = higher score
                max_subs = max([s['substitution_count'] for s in teacher_stats.values()]) or 1
                subs_points = (1 - stats['substitution_count'] / max_subs) * 30
                points_breakdown['fewest_substitutions'] = round(subs_points, 1)
                score += subs_points
                if stats['substitution_count'] > 0:
                    reasons.append(f'حصص إحتياط سابقة: {stats["substitution_count"]}')
            
            points_breakdown['total'] = round(score, 1)
            
            if score > 0 or 'no_conflict' not in criteria:
                # Get teacher name from a schedule
                teacher_schedule = TimetableSchedule.query.filter_by(
                    timetable_id=timetable_id,
                    teacher_xml_id=teacher_xml_id
                ).first()
                
                # Get teacher name from teacher mapping or schedule
                teacher_name = "غير معروف"
                if stats['user_id']:
                    user = User.query.get(stats['user_id'])
                    if user:
                        teacher_name = user.fullName
                
                candidates.append({
                    'teacher_xml_id': teacher_xml_id,
                    'teacher_user_id': stats['user_id'],
                    'teacher_name': teacher_name,
                    'score': score,
                    'reasons': reasons,
                    'points_breakdown': points_breakdown,
                    'weekly_classes': stats['weekly_classes'],
                    'substitution_count': stats['substitution_count']
                })
        
        # Sort candidates by score (highest first)
        candidates.sort(key=lambda x: x['score'], reverse=True)
        
        # Assign the best candidate
        if candidates:
            best = candidates[0]
            assignments.append({
                'schedule': schedule.to_dict(),
                'substitute_teacher': best,
                'all_candidates': candidates[:5]  # Return top 5 for frontend selection
            })
            
            # Update teacher stats to reflect this assignment
            teacher_stats[best['teacher_xml_id']]['weekly_classes'] += 1
            teacher_stats[best['teacher_xml_id']]['substitution_count'] += 1
        else:
            # No suitable substitute found
            assignments.append({
                'schedule': schedule.to_dict(),
                'substitute_teacher': None,
                'all_candidates': []
            })
    
    print(f"DEBUG: calculate_substitute_teachers - Returning {len(assignments)} assignments")
    
    return assignments


@substitution_bp.route('/', methods=['GET'])
@jwt_required()
def get_substitutions():
    """Get all substitutions for the current school"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    # Get query parameters
    timetable_id = request.args.get('timetable_id', type=int)
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    
    query = TeacherSubstitution.query.filter_by(school_id=user.school_id)
    
    if timetable_id:
        query = query.filter_by(timetable_id=timetable_id)
    
    if active_only:
        query = query.filter(
            TeacherSubstitution.is_active == True,
            TeacherSubstitution.end_date >= date.today()
        )
    
    substitutions = query.order_by(TeacherSubstitution.created_at.desc()).all()
    
    # Auto-deactivate substitutions that have passed their end_date
    today = date.today()
    updated_count = 0
    for sub in substitutions:
        if sub.is_active and sub.end_date < today:
            sub.is_active = False
            updated_count += 1
    
    if updated_count > 0:
        db.session.commit()
    
    # If active_only was True, filter out the deactivated ones from response
    if active_only:
        substitutions = [sub for sub in substitutions if sub.is_active]
    
    return jsonify({
        'substitutions': [sub.to_dict() for sub in substitutions]
    }), 200


@substitution_bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_substitution():
    """Calculate substitute teacher assignments without saving"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    data = request.get_json()
    timetable_id = data.get('timetable_id')
    absent_teacher_xml_id = data.get('absent_teacher_xml_id')
    criteria = data.get('criteria', [])
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not timetable_id or not absent_teacher_xml_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify timetable belongs to user's school
    timetable = Timetable.query.get(timetable_id)
    if not timetable or timetable.school_id != user.school_id:
        return jsonify({'error': 'Timetable not found'}), 404
    
    # Calculate assignments for each schedule
    base_assignments = calculate_substitute_teachers(
        timetable_id,
        absent_teacher_xml_id,
        user.school_id,
        criteria,
        start_date=start_date,
        end_date=end_date
    )
    
    # Debug: Log base assignments count and details
    print(f"DEBUG: calculate_substitution - Base assignments count: {len(base_assignments)}")
    if base_assignments:
        print(f"DEBUG: First assignment schedule day_xml_id: {base_assignments[0]['schedule'].get('day_xml_id')}")
        print(f"DEBUG: First assignment schedule period_xml_id: {base_assignments[0]['schedule'].get('period_xml_id')}")
        # Log all unique day_xml_ids in base_assignments
        unique_days = set()
        for ba in base_assignments:
            day_xml_id = ba['schedule'].get('day_xml_id')
            if day_xml_id:
                unique_days.add(str(day_xml_id))
        print(f"DEBUG: Unique day_xml_ids in base_assignments: {unique_days}")
    
    # If dates provided, expand assignments for each working day
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Get working days (Sunday to Thursday)
            working_days = []
            current = start
            # IMPORTANT: Day names must match EXACTLY with database (no hamza on الاحد, الاثنين, الاربعاء)
            day_names = ['الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس']
            
            while current <= end:
                day_of_week = current.weekday()  # 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
                # Convert Python weekday to Arabic day index:
                # Python: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
                # Arabic: 0=الأحد, 1=الإثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس
                if day_of_week == 6:  # Sunday
                    day_index = 0  # الأحد
                elif day_of_week == 0:  # Monday
                    day_index = 1  # الإثنين
                elif day_of_week == 1:  # Tuesday
                    day_index = 2  # الثلاثاء
                elif day_of_week == 2:  # Wednesday
                    day_index = 3  # الأربعاء
                elif day_of_week == 3:  # Thursday
                    day_index = 4  # الخميس
                else:
                    day_index = -1  # Friday or Saturday (weekend)
                
                if 0 <= day_index <= 4:  # Sunday to Thursday
                    working_day = {
                        'date': current.isoformat(),
                        'day_name': day_names[day_index],
                        'day_of_week': day_index
                    }
                    working_days.append(working_day)
                    print(f"DEBUG: Added working day: {current.isoformat()} ({current.strftime('%A')}) -> {day_names[day_index]} (index {day_index})")
                else:
                    print(f"DEBUG: Skipped weekend: {current.isoformat()} ({current.strftime('%A')}) -> day_of_week={day_of_week}")
                current = current + timedelta(days=1)
            
            # Get timetable days to map day_xml_id to day name
            timetable_days = TimetableDay.query.filter_by(timetable_id=timetable_id).all()
            day_xml_id_to_name = {day.day_id: day.name for day in timetable_days}
            
            # Also create reverse mapping: day name to day_xml_ids (in case multiple day_ids map to same name)
            day_name_to_xml_ids = {}
            for day in timetable_days:
                day_name = day.name
                if day_name not in day_name_to_xml_ids:
                    day_name_to_xml_ids[day_name] = []
                day_name_to_xml_ids[day_name].append(day.day_id)
            
            # Get all unique day_xml_ids from schedules to ensure we match correctly
            all_schedule_day_xml_ids = set()
            for base_assignment in base_assignments:
                schedule_day_xml_id = base_assignment['schedule'].get('day_xml_id')
                if schedule_day_xml_id:
                    all_schedule_day_xml_ids.add(schedule_day_xml_id)
            
            # Create a comprehensive mapping: schedule day_xml_id -> TimetableDay
            # First, map all day_ids to their TimetableDay objects
            schedule_day_to_timetable_day = {}
            for day in timetable_days:
                schedule_day_to_timetable_day[day.day_id] = day
                # Also map as string for flexibility
                schedule_day_to_timetable_day[str(day.day_id)] = day
            
            # Then, check all schedules to see which day_xml_ids are actually used
            # and map them to their corresponding TimetableDay
            all_schedules = TimetableSchedule.query.filter_by(timetable_id=timetable_id).all()
            for schedule in all_schedules:
                schedule_day_xml_id = schedule.day_xml_id
                if not schedule_day_xml_id:
                    continue
                    
                # Find the TimetableDay that matches this schedule's day_xml_id
                for day in timetable_days:
                    if (day.day_id == schedule_day_xml_id or 
                        str(day.day_id) == str(schedule_day_xml_id)):
                        schedule_day_to_timetable_day[schedule_day_xml_id] = day
                        schedule_day_to_timetable_day[str(schedule_day_xml_id)] = day
                        break
            
            # Debug: Log working days and timetable days
            print(f"DEBUG: Working days count: {len(working_days)}")
            print(f"DEBUG: Working day names: {[d['day_name'] for d in working_days]}")
            print(f"DEBUG: Timetable days count: {len(timetable_days)}")
            print(f"DEBUG: Timetable day names and IDs: {[(d.name, d.day_id) for d in timetable_days]}")
            print(f"DEBUG: All schedule day_xml_ids from base_assignments: {all_schedule_day_xml_ids}")
            
            # Create a mapping from schedule day_xml_id to working day name
            # This will help us match schedules to working days
            schedule_day_to_working_day = {}
            for day in timetable_days:
                # For each timetable day, find which working day it corresponds to
                for day_info in working_days:
                    working_day_name = day_info['day_name']
                    if day.name == working_day_name or (day.short_name and day.short_name == working_day_name):
                        # Map this day_id to the working day
                        schedule_day_to_working_day[day.day_id] = day_info
                        schedule_day_to_working_day[str(day.day_id)] = day_info
                        # Also map any schedule day_xml_ids that match this day_id
                        for schedule in all_schedules:
                            if (schedule.day_xml_id == day.day_id or 
                                str(schedule.day_xml_id) == str(day.day_id)):
                                schedule_day_to_working_day[schedule.day_xml_id] = day_info
                                schedule_day_to_working_day[str(schedule.day_xml_id)] = day_info
            
            # Expand assignments for each working day
            # For each base assignment (absent teacher's schedule), create an assignment for EACH
            # working day that matches the schedule's day of week
            expanded_assignments = []
            
            print(f"DEBUG: Starting expansion - base_assignments: {len(base_assignments)}, working_days: {len(working_days)}")
            print(f"DEBUG: Working days dates: {[d['date'] for d in working_days]}")
            
            for base_assignment in base_assignments:
                schedule_day_xml_id = base_assignment['schedule'].get('day_xml_id')
                schedule_id = base_assignment['schedule'].get('id')
                
                # Find timetable day for this schedule
                timetable_day = None
                if schedule_day_xml_id:
                    timetable_day = schedule_day_to_timetable_day.get(schedule_day_xml_id)
                    if not timetable_day:
                        timetable_day = schedule_day_to_timetable_day.get(str(schedule_day_xml_id))
                
                # If still not found, try direct comparison
                if not timetable_day and schedule_day_xml_id:
                    for day in timetable_days:
                        if (day.day_id == schedule_day_xml_id or 
                            str(day.day_id) == str(schedule_day_xml_id)):
                            timetable_day = day
                            break
                
                if not timetable_day:
                    print(f"WARNING: Could not find timetable day for schedule_id: {schedule_id}, day_xml_id: {schedule_day_xml_id}")
                    print(f"  Available timetable days: {[(d.name, d.day_id) for d in timetable_days]}")
                    continue  # Skip this assignment if we can't find its day
                
                print(f"DEBUG: Schedule {schedule_id} -> timetable_day: {timetable_day.name} (id: {timetable_day.day_id})")
                
                # Find all working days that match this timetable day's name (day of week)
                # IMPORTANT: Day names may have variations (with/without hamza)
                # Normalize both for comparison
                def normalize_day_name(name):
                    """Normalize Arabic day names by removing hamza and extra chars"""
                    if not name:
                        return ''
                    # Remove hamza variations and normalize
                    normalized = name.replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و').replace('ئ', 'ي')
                    normalized = normalized.replace('ة', 'ه').strip()
                    return normalized.lower()
                
                timetable_day_normalized = normalize_day_name(timetable_day.name)
                short_name_normalized = normalize_day_name(timetable_day.short_name) if timetable_day.short_name else ''
                
                matching_working_days = []
                for working_day in working_days:
                    working_day_normalized = normalize_day_name(working_day['day_name'])
                    
                    day_matches = (timetable_day_normalized == working_day_normalized)
                    short_name_matches = (short_name_normalized and short_name_normalized == working_day_normalized)
                    
                    if day_matches or short_name_matches:
                        matching_working_days.append(working_day)
                        print(f"  Matched working day: {working_day['date']} ({working_day['day_name']}) - normalized: {working_day_normalized} matches {timetable_day_normalized}")
                
                print(f"  Total matching days: {len(matching_working_days)}")
                
                # Create an assignment for each matching working day
                if matching_working_days:
                    for day_info in matching_working_days:
                        assignment_copy = base_assignment.copy()
                        assignment_copy['date'] = day_info['date']
                        assignment_copy['dateString'] = day_info['date']
                        assignment_copy['day_name'] = day_info['day_name']
                        assignment_copy['day_of_week'] = day_info['day_of_week']
                        expanded_assignments.append(assignment_copy)
                    print(f"DEBUG: Schedule {schedule_id} ({timetable_day.name}): Created {len(matching_working_days)} assignments for dates: {[d['date'] for d in matching_working_days]}")
                else:
                    print(f"WARNING: Schedule {schedule_id} ({timetable_day.name if timetable_day else 'unknown'}): No matching working days found")
            
            print(f"DEBUG: Finished expansion - expanded_assignments: {len(expanded_assignments)}, base_assignments: {len(base_assignments)}")
            
            # Return expanded assignments (already filtered by working days)
            return jsonify({
                'assignments': expanded_assignments,
                'working_days': working_days
            }), 200
        except ValueError:
            # Invalid date format, return base assignments
            pass
    
    # Return base assignments without date expansion
    return jsonify({
        'assignments': base_assignments
    }), 200


@substitution_bp.route('/', methods=['POST'])
@jwt_required()
def create_substitution():
    """Create a new teacher substitution with assignments"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['timetable_id', 'absent_teacher_xml_id', 'absent_teacher_name', 'start_date', 'end_date', 'assignments']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    timetable_id = data['timetable_id']
    
    # Verify timetable belongs to user's school
    timetable = Timetable.query.get(timetable_id)
    if not timetable or timetable.school_id != user.school_id:
        return jsonify({'error': 'Timetable not found'}), 404
    
    # Parse dates
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if start_date > end_date:
        return jsonify({'error': 'Start date must be before end date'}), 400
    
    # Get absent teacher user ID from mapping
    # Note: teacher_id in TimetableTeacherMapping is the same as user_id (Teacher inherits from User)
    absent_teacher_mapping = TimetableTeacherMapping.query.filter_by(
        timetable_id=timetable_id,
        xml_teacher_id=data['absent_teacher_xml_id']
    ).first()
    
    absent_teacher_user_id = absent_teacher_mapping.teacher_id if absent_teacher_mapping else None
    
    # Create substitution record
    substitution = TeacherSubstitution(
        timetable_id=timetable_id,
        school_id=user.school_id,
        absent_teacher_xml_id=data['absent_teacher_xml_id'],
        absent_teacher_user_id=absent_teacher_user_id,
        absent_teacher_name=data['absent_teacher_name'],
        start_date=start_date,
        end_date=end_date,
        distribution_criteria=json.dumps(data.get('criteria', [])),
        created_by=user.id,
        is_active=True
    )
    
    db.session.add(substitution)
    db.session.flush()  # Get the ID
    
    # Create assignment records
    same_teacher_for_all_weeks = data.get('same_teacher_for_all_weeks', True)
    
    # Track unique assignments to avoid duplicates
    # Key: (substitute_teacher_xml_id, day_xml_id, period_xml_id, assignment_date)
    unique_assignments = {}
    
    for assignment_data in data['assignments']:
        # Parse assignment_date if provided
        assignment_date = None
        if 'date' in assignment_data and assignment_data['date']:
            try:
                assignment_date = datetime.strptime(assignment_data['date'], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                assignment_date = None
        
        # Create unique key to check for duplicates
        # A duplicate is: same substitute teacher, same day, same period, same date
        unique_key = (
            assignment_data['substitute_teacher_xml_id'],
            assignment_data['day_xml_id'],
            assignment_data['period_xml_id'],
            assignment_date.isoformat() if assignment_date else None
        )
        
        # Skip if this exact assignment already exists
        if unique_key in unique_assignments:
            print(f"DEBUG: Skipping duplicate assignment: {unique_key}")
            continue
        
        # Mark this key as used
        unique_assignments[unique_key] = True
        
        assignment = SubstitutionAssignment(
            substitution_id=substitution.id,
            schedule_id=assignment_data['schedule_id'],
            class_name=assignment_data['class_name'],
            subject_name=assignment_data['subject_name'],
            day_xml_id=assignment_data['day_xml_id'],
            period_xml_id=assignment_data['period_xml_id'],
            substitute_teacher_xml_id=assignment_data['substitute_teacher_xml_id'],
            substitute_teacher_user_id=assignment_data.get('substitute_teacher_user_id'),
            substitute_teacher_name=assignment_data['substitute_teacher_name'],
            assignment_reason=assignment_data.get('assignment_reason', ''),
            assignment_date=assignment_date  # Always save the specific date for selected days only
        )
        db.session.add(assignment)
    
    print(f"DEBUG: Created {len(unique_assignments)} unique assignments from {len(data['assignments'])} total assignments")
    
    db.session.commit()
    
    # Create notifications for substitution
    # BEST PRACTICE: Only notify affected teachers (absent + substitutes), not admins
    try:
        from app.services.notification_utils import deduplicate_user_ids
        
        # Track all notified teacher IDs to avoid duplicates
        notified_teacher_ids = set()
        
        # Notify the absent teacher
        if absent_teacher_user_id:
            create_notification(
                school_id=user.school_id,
                title="تم تعيين بديل",
                message=f"تم تعيين معلمين بدلاء لحصصك من {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}",
                notification_type='substitution',
                created_by=current_user,
                priority='high',
                target_user_ids=[absent_teacher_user_id],
                related_entity_type='substitution',
                related_entity_id=substitution.id,
                action_url='/app/teacher-substitution'
            )
            notified_teacher_ids.add(absent_teacher_user_id)
        
        # Group assignments by substitute teacher to send one notification per teacher
        # instead of one per assignment
        teacher_assignments = {}
        for assignment_data in data['assignments']:
            teacher_id = assignment_data.get('substitute_teacher_user_id')
            if teacher_id and teacher_id not in notified_teacher_ids:
                if teacher_id not in teacher_assignments:
                    teacher_assignments[teacher_id] = []
                teacher_assignments[teacher_id].append(assignment_data)
        
        # Send a single consolidated notification to each substitute teacher
        for teacher_id, assignments in teacher_assignments.items():
            # Build a summary of all their substitution assignments
            num_assignments = len(assignments)
            first_assignment = assignments[0]
            
            if num_assignments == 1:
                # Single assignment - detailed message
                substitution_data = {
                    'id': substitution.id,
                    'class_name': first_assignment.get('class_name', 'غير محدد'),
                    'subject_name': first_assignment.get('subject_name', 'غير محدد'),
                    'absent_teacher_name': data['absent_teacher_name'],
                    'period': first_assignment.get('period_xml_id', '-'),
                    'date': first_assignment.get('assignment_date', start_date.strftime('%Y-%m-%d')) if first_assignment.get('assignment_date') else start_date.strftime('%Y-%m-%d')
                }
                
                notify_teacher_substitution(
                    teacher_id=teacher_id,
                    school_id=user.school_id,
                    substitution_data=substitution_data,
                    created_by=current_user
                )
            else:
                # Multiple assignments - summary message
                classes = set(a.get('class_name', 'غير محدد') for a in assignments)
                message = f"""
🔄 إحتياط جديد - عدة حصص

👨‍🏫 بديل عن: {data['absent_teacher_name']}
📊 عدد الحصص: {num_assignments}
🎓 الفصول: {', '.join(list(classes)[:3])}{'...' if len(classes) > 3 else ''}
📅 من: {start_date.strftime('%Y-%m-%d')}
📅 إلى: {end_date.strftime('%Y-%m-%d')}

⚠️ يرجى مراجعة الجدول للتفاصيل الكاملة
"""
                create_notification(
                    school_id=user.school_id,
                    title="🔄 إحتياط جديد - عدة حصص",
                    message=message.strip(),
                    notification_type='substitution',
                    created_by=current_user,
                    priority='urgent',
                    target_user_ids=[teacher_id],
                    related_entity_type='substitution',
                    related_entity_id=substitution.id,
                    action_url='/app/teacher-substitution'
                )
            
            notified_teacher_ids.add(teacher_id)
        
        # NOTE: Removed admin notification - they don't need to be notified about every substitution
        # Admins can view substitutions in their dashboard if needed
        print(f"✅ Substitution notifications sent to {len(notified_teacher_ids)} teachers (no admin spam)")
        
    except Exception as e:
        print(f"Error creating substitution notifications: {str(e)}")
    
    return jsonify({
        'message': 'Substitution created successfully',
        'substitution': substitution.to_dict()
    }), 201


@substitution_bp.route('/<int:substitution_id>', methods=['GET'])
@jwt_required()
def get_substitution(substitution_id):
    """Get a specific substitution with all assignments"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    substitution = TeacherSubstitution.query.get(substitution_id)
    
    if not substitution or substitution.school_id != user.school_id:
        return jsonify({'error': 'Substitution not found'}), 404
    
    return jsonify({
        'substitution': substitution.to_dict()
    }), 200


@substitution_bp.route('/<int:substitution_id>', methods=['PUT'])
@jwt_required()
def update_substitution(substitution_id):
    """Update substitution assignments (change substitute teachers)"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    substitution = TeacherSubstitution.query.get(substitution_id)
    
    if not substitution or substitution.school_id != user.school_id:
        return jsonify({'error': 'Substitution not found'}), 404
    
    data = request.get_json()
    assignments_data = data.get('assignments', [])
    
    if not assignments_data:
        return jsonify({'error': 'No assignments provided'}), 400
    
    # Get teacher mappings
    teacher_mappings = {
        tm.xml_teacher_id: {
            'user_id': tm.teacher_id,
            'name': tm.xml_teacher_name
        }
        for tm in TimetableTeacherMapping.query.filter_by(timetable_id=substitution.timetable_id).all()
    }
    
    # Update each assignment
    updated_count = 0
    for assignment_data in assignments_data:
        assignment_id = assignment_data.get('assignment_id')
        substitute_teacher_xml_id = assignment_data.get('substitute_teacher_xml_id')
        
        if not assignment_id or not substitute_teacher_xml_id:
            continue
        
        assignment = SubstitutionAssignment.query.get(assignment_id)
        if not assignment or assignment.substitution_id != substitution_id:
            continue
        
        # Get teacher info
        teacher_info = teacher_mappings.get(substitute_teacher_xml_id, {})
        
        assignment.substitute_teacher_xml_id = substitute_teacher_xml_id
        assignment.substitute_teacher_user_id = teacher_info.get('user_id')
        assignment.substitute_teacher_name = teacher_info.get('name', substitute_teacher_xml_id)
        assignment.assignment_reason = assignment_data.get('assignment_reason', assignment.assignment_reason)
        
        updated_count += 1
    
    db.session.commit()
    
    # Reload substitution with updated assignments
    db.session.refresh(substitution)
    
    return jsonify({
        'message': f'Updated {updated_count} assignment(s) successfully',
        'substitution': substitution.to_dict()
    }), 200


@substitution_bp.route('/<int:substitution_id>', methods=['DELETE'])
@jwt_required()
def delete_substitution(substitution_id):
    """Delete a substitution and all its assignments"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    substitution = TeacherSubstitution.query.get(substitution_id)
    
    if not substitution or substitution.school_id != user.school_id:
        return jsonify({'error': 'Substitution not found'}), 404
    
    db.session.delete(substitution)
    db.session.commit()
    
    return jsonify({
        'message': 'Substitution deleted successfully'
    }), 200


@substitution_bp.route('/<int:substitution_id>/deactivate', methods=['POST'])
@jwt_required()
def deactivate_substitution(substitution_id):
    """Deactivate a substitution (soft delete)"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    substitution = TeacherSubstitution.query.get(substitution_id)
    
    if not substitution or substitution.school_id != user.school_id:
        return jsonify({'error': 'Substitution not found'}), 404
    
    substitution.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Substitution deactivated successfully',
        'substitution': substitution.to_dict()
    }), 200


@substitution_bp.route('/teacher/<int:teacher_user_id>', methods=['GET'])
@jwt_required()
def get_teacher_substitutions(teacher_user_id):
    """Get all active substitution assignments for a specific teacher"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    if not user or not user.school_id:
        return jsonify({'error': 'User not found or not associated with a school'}), 404
    
    # Auto-deactivate expired substitutions first
    today = date.today()
    expired_substitutions = TeacherSubstitution.query.filter(
        TeacherSubstitution.school_id == user.school_id,
        TeacherSubstitution.is_active == True,
        TeacherSubstitution.end_date < today
    ).all()
    
    for sub in expired_substitutions:
        sub.is_active = False
    
    if expired_substitutions:
        db.session.commit()
    
    # Get active substitutions for this teacher
    assignments = SubstitutionAssignment.query.filter_by(
        substitute_teacher_user_id=teacher_user_id
    ).join(TeacherSubstitution).filter(
        TeacherSubstitution.school_id == user.school_id,
        TeacherSubstitution.is_active == True,
        TeacherSubstitution.end_date >= date.today()
    ).all()
    
    # Enhance assignments with substitution date range and absent teacher info
    assignments_data = []
    for assignment in assignments:
        assignment_dict = assignment.to_dict()
        # Add substitution date range for date filtering
        if assignment.substitution:
            assignment_dict['substitution_start_date'] = assignment.substitution.start_date.isoformat() if assignment.substitution.start_date else None
            assignment_dict['substitution_end_date'] = assignment.substitution.end_date.isoformat() if assignment.substitution.end_date else None
            assignment_dict['absent_teacher_name'] = assignment.substitution.absent_teacher_name
            assignment_dict['absent_teacher_xml_id'] = assignment.substitution.absent_teacher_xml_id
        assignments_data.append(assignment_dict)
    
    return jsonify({
        'assignments': assignments_data
    }), 200

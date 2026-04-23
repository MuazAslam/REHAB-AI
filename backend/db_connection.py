from werkzeug.security import generate_password_hash, check_password_hash
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGODB_URI")

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))


db = client["GYM-App"]
users_collection = db["users"]
doctors_collection = db['doctors']
daily_activity_collection = db["daily_activity"] 
exercises_collection = db["exercises"]
assigned_exercises_collection = db["assigned_exercises"]

# def add_exercise(name, description,):
#     exercise_doc = {
#         "name": name,
#         "description": description,
#     }
#     exercises_collection.insert_one(exercise_doc)
#     return True
# add_exercise("Plank" , "A plank is an isometric core exercise where you hold your body in a straight, rigid line (like a wooden plank) supported by your forearms and toes, engaging abs, back, shoulders, glutes, and legs to build strength and stability, requiring no equipment and forming a straight line from head to heels")

# def add_doctor(name, email, password):
#     # Check if doctor already exists
#     if doctors_collection.find_one({"email": email}):
#         return "Doctor_Exist"

#     hashed_password = generate_password_hash(password)

#     doctor_doc = {
#         "name": name,
#         "email": email,
#         "password": hashed_password,
#         "gender" : "Male",
#         "profile_picture": "doctor_img.jpeg",
#         "role": "Doctor"
#     }

#     doctors_collection.insert_one(doctor_doc)
#     return True
# add_doctor("Doctor Name" , "[EMAIL_ADDRESS]" , "doctor123")
    

def register_user(name, email, password, profile_picture_filename , weight , height , age , gender):
    # Check if user already exists
    if users_collection.find_one({"email": email}) or doctors_collection.find_one({"email": email}):
        return "User_Exist"
    today = datetime.now().strftime("%Y-%m-%d")

    hashed_password = generate_password_hash(password)

    user_doc = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "profile_picture": profile_picture_filename,
        "weight" : weight,
        "height" : height,
        "age" : age,
        "gender" : gender,
        "role" : "Patient",
        "Joined_on" : today,
        "therapist" : "693d3d0fc1ab9f120b8fbfd9"

    }

    users_collection.insert_one(user_doc)
    return True

def authenticate_user(email, password):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            user =  doctors_collection.find_one({"email": email})

        if user and check_password_hash(user["password"], password):
            if user["role"] == "Patient":
                return [
                    str(user["_id"]),
                    user["name"],
                    user["email"],
                    user.get("profile_picture"),
                    user["role"],
                    user["gender"],
                    user["weight"],
                    user["height"],
                    user["age"],
                    user["Joined_on"],
                    user["therapist"]
                ]
            else:
                return [
                    str(user["_id"]),
                    user["name"],
                    user["email"],
                    user.get("profile_picture"),
                    user["role"],
                    user["gender"],
                ]

        return False
    except Exception as e:
        print(e)

#---------------------------Daily Activity------------------------------
def save_daily_activity(user_id, mood, sleep_hours, fatigue_level):
    today = datetime.now().strftime("%Y-%m-%d")

    payload = {
        "user_id": user_id,
        "date": today,
        "mood": mood,
        "sleep_hours": sleep_hours,
        "fatigue_level": fatigue_level 
    }

    # Check if today's record already exists → UPDATE instead
    existing = daily_activity_collection.find_one({"user_id": user_id, "date": today})

    if existing:
        # update only mood/sleep/fatigue (keep exercise status)
        daily_activity_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "mood": mood,
                "sleep_hours": sleep_hours,
                "fatigue_level": fatigue_level
            }}
        )
        return True


    # Insert new record
    daily_activity_collection.insert_one(payload)
    return True


def get_today_activity(user_id):
    today = datetime.now().strftime("%Y-%m-%d")
    result = daily_activity_collection.find_one({"user_id": user_id, "date": today})

    if result:
        return {
            "mood": result.get("mood"),
            "sleep_hours": result.get("sleep_hours"),
            "fatigue_level": result.get("fatigue_level")
        }
    return None


def get_doctor_patients(doctor_id):
    """Get all patients assigned to this doctor"""
    try:
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        patient_list = []
        
        for patient in patients:
            patient_list.append({
                "_id": str(patient["_id"]),
                "name": patient["name"],
                "email": patient["email"],
                "profile_picture": patient.get("profile_picture"),
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "weight": patient.get("weight"),
                "height": patient.get("height"),
                "joined_on": patient.get("Joined_on")
            })
        
        # Use Trie for efficient sorting and searching
        trie = PatientTrie()
        for patient in patient_list:
            trie.insert(patient)
        
        # Get sorted patients from Trie
        sorted_patients = trie.get_all_sorted()
        
        return sorted_patients
    except Exception as e:
        print(f"Error fetching patients: {e}")
        return []



# ============ TRIE DATA STRUCTURE (Advanced DSA) ============
class TrieNode:
    """Node in the Trie structure"""
    def __init__(self):
        self.children = {}
        self.patients = []  # Store patients at this node
        self.is_end_of_name = False


class PatientTrie:
    """
    Trie (Prefix Tree) for efficient patient name searching and sorting
    
    Time Complexity:
    - Insert: O(k) where k = length of name
    - Search: O(k) where k = length of prefix
    - Get All Sorted: O(n) where n = number of patients
    
    Space Complexity: O(n × k) where n = patients, k = avg name length
    """
    
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, patient):
        """Insert a patient into the Trie"""
        name = patient.get("name", "").lower()
        node = self.root
        
        for char in name:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        
        node.is_end_of_name = True
        node.patients.append(patient)
    
    def search_prefix(self, prefix):
        """
        Search for all patients whose names start with the given prefix
        Returns: List of matching patients
        Time Complexity: O(k + m) where k=prefix length, m=matching results
        """
        prefix = prefix.lower()
        node = self.root
        
        # Navigate to the prefix node
        for char in prefix:
            if char not in node.children:
                return []  # Prefix not found
            node = node.children[char]
        
        # Collect all patients from this node onwards
        return self._collect_all_patients(node)
    
    def _collect_all_patients(self, node):
        """Recursively collect all patients from a node"""
        patients = []
        
        # Add patients at current node
        if node.is_end_of_name:
            patients.extend(node.patients)
        
        # Recursively collect from children (in alphabetical order)
        for char in sorted(node.children.keys()):
            patients.extend(self._collect_all_patients(node.children[char]))
        
        return patients
    
    def get_all_sorted(self):
        """
        Get all patients in alphabetically sorted order
        Uses in-order traversal of Trie
        Time Complexity: O(n)
        """
        return self._collect_all_patients(self.root)


#============ EXERCISE MANAGEMENT ============
def get_all_exercises():
    """Get all available exercises from the database"""
    try:
        exercises = list(exercises_collection.find({}))
        exercise_list = []
        
        for exercise in exercises:
            exercise_list.append({
                "_id": str(exercise["_id"]),
                "name": exercise["name"],
                "description": exercise.get("description", "")
            })
        
        return exercise_list
    except Exception as e:
        print(f"Error fetching recovery metrics: {e}")
        return None


def get_patient_exercise_performance(patient_id, exercise_name="Plank"):
    """
    Fetch detailed performance metrics for a specific completed exercise.
    Returns list of session data for charts/analysis.
    """
    from datetime import datetime
    try:
        assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
        if not assignment:
            return []

        exercises = assignment.get("exercises", [])
        performance_data = []

        for ex in exercises:
            # Filter for completed specific exercises (e.g., "Plank")
            if (ex.get("exercise_name") == exercise_name and 
                ex.get("status") == "completed" and 
                ex.get("completed_at")):
                
                # Extract session stats if available
                stats = ex.get("session_stats", {})
                
                # Basic data
                data_point = {
                    "date": ex["completed_at"].strftime("%Y-%m-%d"),
                    "timestamp": ex["completed_at"].isoformat(),
                    "duration_seconds": ex.get("duration_minutes", 0) * 60, # Fallback if not in stats
                    "total_frames": 0,
                    "total_predictions": 0,
                    "avg_confidence": 0,
                    "form_percentage": 0
                }

                # Enhance with detailed session stats if they exist
                if stats:
                    data_point["duration_seconds"] = stats.get("duration_seconds", data_point["duration_seconds"])
                    data_point["total_frames"] = stats.get("total_frames", 0)
                    data_point["total_predictions"] = stats.get("total_predictions", 0)
                    data_point["avg_confidence"] = stats.get("avg_confidence", 0)
                    
                    # Calculate Form Percentage (Good/Total) using huffman or counters if stored
                    # Implementation depends on what 'session_stats' actually contains.
                    # Assuming session_stats might have 'class_counts' like {'C': 100, 'I': 20}
                    
                    correct = stats.get("average_count")
                    incorrect = stats.get("notaverage_count")
                    total = correct + incorrect
                    
                    if total > 0:
                        data_point["average_percentage"] = round((correct / total) * 100, 1)
                
                performance_data.append(data_point)

        # Sort by date descending (newest first)
        performance_data.sort(key=lambda x: x["timestamp"], reverse=True)
        return performance_data

    except Exception as e:
        print(f"Error fetching performance data: {e}")
        return []


def assign_exercise_to_patient(patient_id, doctor_id, exercises_data):
    """
    Assign exercises to a patient
    exercises_data: list of dicts with exercise_id and duration_minutes
    """
    try:
        from bson import ObjectId
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Format exercises with full details
        formatted_exercises = []
        for ex in exercises_data:
            # Fetch exercise details
            exercise = exercises_collection.find_one({"_id": ObjectId(ex["exercise_id"])})
            if exercise:
                assigned_time = datetime.now()
                deadline = assigned_time + timedelta(hours=24)
                
                formatted_exercises.append({
                    "exercise_id": str(exercise["_id"]),
                    "exercise_name": exercise["name"],
                    "duration_minutes": ex["duration_minutes"],
                    "assigned_date": today,
                    "assigned_timestamp": assigned_time,
                    "deadline": deadline,
                    "status": "pending",  # pending, completed, missed
                    "completed_at": None
                })
        
        # Create assignment document
        assignment_doc = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "exercises": formatted_exercises,
            "created_at": datetime.now()
        }
        
        # Check if patient already has assignments
        existing = assigned_exercises_collection.find_one({"patient_id": patient_id})
        
        if existing:
            # Append new exercises to existing ones
            assigned_exercises_collection.update_one(
                {"_id": existing["_id"]},
                {"$push": {"exercises": {"$each": formatted_exercises}}}
            )
        else:
            # Create new assignment
            assigned_exercises_collection.insert_one(assignment_doc)
        
        return True
    except Exception as e:
        print(f"Error assigning exercises: {e}")
        return False


def get_patient_exercises(patient_id):
    import heapq
    from datetime import datetime
    try:
        assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
        if not assignment:
            return []

        exercises = assignment.get("exercises", [])
        current_time = datetime.now()
        updated = False

        # Build min-heap of pending exercises by deadline
        heap = []
        for ex in exercises:
            if ex.get("status") == "pending" and ex.get("deadline"):
                heapq.heappush(heap, (ex["deadline"], ex))

        # Check overdue exercises from heap
        while heap and heap[0][0] < current_time:
            _, exercise = heapq.heappop(heap)
            exercise["status"] = "missed"
            updated = True

        if updated:
            assigned_exercises_collection.update_one(
                {"_id": assignment["_id"]},
                {"$set": {"exercises": exercises}}
            )

        STATUS_PRIORITY = {
            "pending": 0,
            "completed": 1,
            "missed": 2
        }

        exercises.sort(
            key=lambda x: STATUS_PRIORITY.get(x.get("status", "pending"), 99)
        )

        return exercises

    except Exception as e:
        print(f"Error fetching patient exercises: {e}")
        return []


def get_patient_exercises_advanced(patient_id):
    """
    Advanced exercise retrieval with DSA optimizations:
    - Min-Heap for efficient overdue detection
    - Priority sorting by status and deadline
    - HashMap for date-based grouping
    - Ordered output (Today, Yesterday, then older dates)
    """
    from datetime import datetime, timedelta
    from collections import defaultdict
    import heapq

    assignment = assigned_exercises_collection.find_one(
        {"patient_id": patient_id}
    )
    if not assignment:
        return {}

    exercises = assignment.get("exercises", [])
    now = datetime.now()
    updated = False

    # =========================
    # 1️⃣ Heap → Overdue detection (O(log n) per operation)
    # =========================
    heap = []
    for idx, ex in enumerate(exercises):
        if ex.get("status") == "pending" and ex.get("deadline"):
            heapq.heappush(heap, (ex["deadline"], idx))

    while heap and heap[0][0] < now:
        _, idx = heapq.heappop(heap)
        if exercises[idx]["status"] == "pending":
            exercises[idx]["status"] = "missed"
            updated = True

    if updated:
        assigned_exercises_collection.update_one(
            {"_id": assignment["_id"]},
            {"$set": {"exercises": exercises}}
        )

    # =========================
    # 2️⃣ Priority sorting (pending → completed → missed)
    # =========================
    STATUS_ORDER = {"pending": 0, "completed": 1, "missed": 2}

    exercises.sort(
        key=lambda ex: (
            STATUS_ORDER.get(ex["status"], 99),
            ex.get("deadline") or datetime.max
        )
    )

    # =========================
    # 3️⃣ Group by date (HashMap - O(1) access)
    # =========================
    grouped = defaultdict(list)
    today = now.date()
    yesterday = today - timedelta(days=1)

    for ex in exercises:
        date = datetime.strptime(
            ex["assigned_date"], "%Y-%m-%d"
        ).date()

        if date == today:
            key = "Today"
        elif date == yesterday:
            key = "Yesterday"
        else:
            key = date.strftime("%d %b %Y")

        grouped[key].append(ex)

    # =========================
    # 4️⃣ Ordered output (Today first, then Yesterday, then chronological)
    # =========================
    result = {}
    for k in ["Today", "Yesterday"]:
        if k in grouped:
            result[k] = grouped.pop(k)

    for k in sorted(
        grouped.keys(),
        key=lambda d: datetime.strptime(d, "%d %b %Y"),
        reverse=True
    ):
        result[k] = grouped[k]

    return result

def complete_exercise(patient_id, exercise_id, pain_feedback=None , session_stats=None):
    """Mark an exercise as completed with optional pain feedback"""

    print(f"[DB] Attempting to complete exercise: PatID={patient_id}, ExID={exercise_id}")
    assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})

        
    if not assignment:
        print(f"[DB] Failure: No assignment found for patient {patient_id}")
        return False
            
    exercises = assignment.get("exercises", [])
    updated = False
        
    # Find and update the specific exercise
    for exercise in exercises:
          
            if exercise.get("exercise_id") == exercise_id:
                if exercise.get("status") == "pending":

                    exercise["status"] = "completed"
                    exercise["completed_at"] = datetime.now()
                    
                    # Add pain feedback if provided
                    if pain_feedback:
                        exercise["pain_feedback"] = {
                            "had_pain": pain_feedback.get("had_pain", False),
                            "pain_intensity": pain_feedback.get("pain_intensity"),
                            "pain_locations": pain_feedback.get("pain_locations", [])
                        }
                        
                    # Add detailed session stats (Huffman data, etc)
                    if session_stats:
                        exercise["session_stats"] = session_stats
                    
                    updated = True
                    print(f"[DB] Success: Exercise marked as completed.")
                    break
                
        
        # Update database
    if updated:
            assigned_exercises_collection.update_one(
                {"_id": assignment["_id"]},
                {"$set": {"exercises": exercises}}
            )
            return True
        
    if not updated:
             print(f"[DB] Failure: No matching pending exercise found for ID {exercise_id}")
        
    return False



def get_patient_pain_history(patient_id):
    from sortedcontainers import SortedDict
    try:
        assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
        if not assignment:
            return []

        exercises = assignment.get("exercises", [])
        pain_data = {}
        current_date = datetime.now().date()

        for exercise in exercises:
            if exercise.get("status") == "completed" and exercise.get("pain_feedback"):
                feedback = exercise["pain_feedback"]
                if feedback.get("had_pain") and feedback.get("pain_locations"):
                    completed_at = exercise.get("completed_at")
                    report_date = completed_at.date() if completed_at else None
                    intensity = feedback.get("pain_intensity", 0)

                    for location in feedback.get("pain_locations", []):
                        if location not in pain_data:
                            # Use SortedDict to keep dates sorted automatically
                            pain_data[location] = SortedDict()
                        if report_date:
                            pain_data[location][report_date] = max(
                                pain_data[location].get(report_date, 0),
                                intensity
                            )

        # Build pain_history output
        pain_history = []
        for location, date_map in pain_data.items():
            first_reported = next(iter(date_map))
            last_reported = next(reversed(date_map))
            max_intensity = max(date_map.values())
            days_since = (current_date - last_reported).days

            status = (
                "active" if days_since <= 2 else
                "recovering" if days_since <= 7 else
                "recovered"
            )

            pain_history.append({
                "body_part": location,
                "first_reported": first_reported.isoformat(),
                "last_reported": last_reported.isoformat(),
                "status": status,
                "days_since_last_pain": days_since,
                "total_reports": len(date_map),
                "max_intensity": max_intensity
            })

        pain_history.sort(key=lambda x: {"active":0,"recovering":1,"recovered":2}[x["status"]])
        return pain_history

    except Exception as e:
        print(f"Error fetching pain history: {e}")
        return []

def get_recovery_metrics(user_id, days=7):
    from datetime import datetime, timedelta
    from collections import deque
    from bisect import bisect_left, bisect_right

    try:
        today = datetime.now().date()

        # =========================
        # Fetch wellness data
        # =========================
        from_date_str = (today - timedelta(days=days)).isoformat()

        wellness_data = list(daily_activity_collection.find({
            "user_id": user_id,
            "date": {"$gte": from_date_str}
        }))

        # Map wellness by date
        wellness_map = {}
        for w in wellness_data:
            w_date = w["date"]
            if isinstance(w_date, datetime):
                w_date = w_date.date()
            elif isinstance(w_date, str):
                w_date = datetime.fromisoformat(w_date).date()
            else:
                continue
            wellness_map[w_date.isoformat()] = w

        # =========================
        # Fetch exercises (FILTER BY DATE RANGE)
        # =========================
        assignment = assigned_exercises_collection.find_one(
            {"patient_id": user_id}
        )
        all_exercises = assignment.get("exercises", []) if assignment else []

        from_date = today - timedelta(days=days)
        exercises = []

        for ex in all_exercises:
            if ex.get("assigned_date"):
                try:
                    ex_date = datetime.fromisoformat(
                        ex["assigned_date"]
                    ).date()
                    if from_date <= ex_date <= today:
                        exercises.append(ex)
                except Exception:
                    pass

        # =========================
        # SORT exercises by date (REQUIRED for binary search)
        # =========================
        exercises.sort(
            key=lambda ex: datetime.fromisoformat(ex["assigned_date"]).date()
        )

        exercise_dates_sorted = [
            datetime.fromisoformat(ex["assigned_date"]).date().isoformat()
            for ex in exercises
        ]

        # =========================
        # Fetch pain history
        # =========================
        pain_history = get_patient_pain_history(user_id)

        daily_scores = []

        # =========================
        # Collect all relevant dates
        # =========================
        exercise_dates = set(exercise_dates_sorted)
        all_dates = set(list(wellness_map.keys()) + list(exercise_dates))

        sorted_dates = sorted(
            all_dates,
            key=lambda d: datetime.fromisoformat(d)
        )

        # =========================
        # Helper: Binary Search by date
        # =========================
        def get_exercises_for_date(date_str):
            left = bisect_left(exercise_dates_sorted, date_str)
            right = bisect_right(exercise_dates_sorted, date_str)
            return exercises[left:right]

        # =========================
        # Compute daily scores
        # =========================
        for date_str in sorted_dates:
            # Wellness
            wellness = wellness_map.get(date_str, {})
            mood_score = wellness.get("mood", 50)
            sleep_hours = wellness.get("sleep_hours", 6)
            sleep_score = min((sleep_hours / 8) * 100, 100)
            fatigue_score = wellness.get("fatigue_level", 50)

            # Pain
            if pain_history:
                status_weight = {
                    "recovered": 100,
                    "recovering": 70,
                    "active": 40
                }
                pain_scores = []
                for p in pain_history:
                    base = status_weight.get(p.get("status"), 50)
                    penalty = p.get("max_intensity", 0) * 6
                    pain_scores.append(max(0, base - penalty))
                pain_score = sum(pain_scores) / len(pain_scores)
            else:
                pain_score = 100

            # Exercises (BINARY SEARCH HERE)
            date_exercises = get_exercises_for_date(date_str)

            if date_exercises:
                completed = sum(
                    1 for ex in date_exercises
                    if ex.get("status") == "completed"
                )
                consistency_score = (completed / len(date_exercises)) * 100
            else:
                consistency_score = 100

            # Composite
            composite_score = (
                pain_score * 0.40 +
                consistency_score * 0.20 +
                sleep_score * 0.15 +
                mood_score * 0.15 +
                fatigue_score * 0.10
            )

            daily_scores.append({
                "date": date_str,
                "pain_score": round(pain_score, 1),
                "mood_score": round(mood_score, 1),
                "sleep_score": round(sleep_score, 1),
                "fatigue_score": round(fatigue_score, 1),
                "consistency_score": round(consistency_score, 1),
                "composite_score": round(composite_score, 1)
            })

        # =========================
        # Trend (7-day rolling average)
        # =========================
        trend = {"direction": "insufficient_data", "delta": 0}

        if len(daily_scores) >= 14:
            last7 = deque(d["composite_score"] for d in daily_scores[-7:])
            prev7 = deque(d["composite_score"] for d in daily_scores[-14:-7])

            recent_avg = sum(last7) / 7
            previous_avg = sum(prev7) / 7
            delta = recent_avg - previous_avg

            trend = {
                "direction": (
                    "improving" if delta > 3
                    else "declining" if delta < -3
                    else "stable"
                ),
                "delta": round(delta, 1)
            }

        # =========================
        # Warnings
        # =========================
        warnings = []
        for i in range(2, len(daily_scores)):
            prev_avg = (
                daily_scores[i - 1]["composite_score"] +
                daily_scores[i - 2]["composite_score"]
            ) / 2
            if daily_scores[i]["composite_score"] < prev_avg - 20 and not warnings:
                warnings.append({
                    "type": "sudden_drop",
                    "severity": "high",
                    "message": "Recovery score dropped sharply"
                })
        return {
            "current_score": (
                daily_scores[-1]["composite_score"]
                if daily_scores else 0
            ),
            "daily_scores": daily_scores,
            "trend": trend,
            "warnings": warnings
        }

    except Exception as e:
        print("Recovery calculation error:", e)
        return {
            "current_score": 0,
            "daily_scores": [],
            "trend": {"direction": "error", "delta": 0},
            "warnings": []
        }


# ============ DOCTOR DASHBOARD FUNCTIONS (Advanced DSA) ============

def get_doctor_overview_stats(doctor_id):
    """
    Get comprehensive doctor overview statistics
    DSA: HashMap for O(1) aggregation
    """
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    try:
        # Get all patients for this doctor
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        if not patients:
            return {
                "total_patients": 0,
                "active_patients": 0,
                "avg_daily_app_usage": 0,
                "avg_recovery_score": 0,
                "pain_improvement_rate": 0
            }
        
        # HashMap for O(1) counting
        stats = {
            "total_patients": len(patients),
            "active_patients": 0,
            "avg_recovery_score": 0,
            "pain_improvement_rate": 0,
            "avg_ai_confidence": 0,
            "avg_correct_percentage": 0
        }
        
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Lists for averaging
        recovery_scores = []
        pain_improvements = []
        ai_confidences = []
        correct_percentages = []
        
        # Get all assigned exercises for these patients to aggregate global stats
        patient_ids = [str(p["_id"]) for p in patients]
        all_assignments = list(assigned_exercises_collection.find({"patient_id": {"$in": patient_ids}}))
        
        for assignment in all_assignments:
            exercises = assignment.get("exercises", [])
            for ex in exercises:
                if ex.get("status") == "completed" and "session_stats" in ex:
                    stats_data = ex["session_stats"]
                    
                    # Aggregate Confidence
                    conf = stats_data.get("average_confidence", stats_data.get("confidence", 0))
                    if conf > 0:
                        ai_confidences.append(conf)
                    
                    # Aggregate Correctness (Accuracy)
                    # Use provided accuracy or calculate from class_counts
                    acc = stats_data.get("average_percentage")
                    if acc is None:
                        correct = stats_data.get("average_count", {})
                        incorrect = stats_data.get("not_average_count", {})
                        total = correct + incorrect
                        if total > 0:
                            acc = (correct / total) * 100
                    
                    if acc is not None:
                        correct_percentages.append(acc)

        for patient in patients:
            patient_id = str(patient["_id"])
            
            # Check if active (has recent wellness data)
            recent_activity = daily_activity_collection.find_one({
                "user_id": patient_id,
                "date": {"$gte": seven_days_ago}
            })
            if recent_activity:
                stats["active_patients"] += 1
            
            # Get recovery score
            try:
                metrics = get_recovery_metrics(patient_id, days=7)
                recovery_scores.append(metrics["current_score"])
            except:
                pass
            
            # Get pain improvement rate
            try:
                pain_history = get_patient_pain_history(patient_id)
                if pain_history:
                    total_pains = len(pain_history)
                    if total_pains > 0:
                        recovering_or_recovered = len([p for p in pain_history if p["status"] in ["recovering", "recovered"]])
                        improvement_rate = (recovering_or_recovered / total_pains) * 100
                        pain_improvements.append(improvement_rate)
            except:
                pass
        
        # Final averages
        if recovery_scores:
            stats["avg_recovery_score"] = round(sum(recovery_scores) / len(recovery_scores), 1)
        
        if pain_improvements:
            stats["pain_improvement_rate"] = round(sum(pain_improvements) / len(pain_improvements), 1)
            
        if ai_confidences:
            stats["avg_ai_confidence"] = round(sum(ai_confidences) / len(ai_confidences), 1)
            
        if correct_percentages:
            stats["avg_correct_percentage"] = round(sum(correct_percentages) / len(correct_percentages), 1)
        
        return stats
        
        
    except Exception as e:
        print(f"Error in get_doctor_overview_stats: {e}")
        return {
            "total_patients": 0,
            "active_patients": 0,
            "avg_daily_app_usage": 0,
            "avg_recovery_score": 0,
            "pain_improvement_rate": 0
        }


def get_doctor_recovery_trends(doctor_id, days=7, view_mode="cohort"):
    """
    Get recovery score trends over time
    DSA: HashMap for O(1) date aggregation
    view_mode: "cohort" for average, "patient_wise" for individual patient trends
    """
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    try:
        # Get all patients for this doctor
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        if not patients:
            return {"trend_data": [], "patient_trends": []}
        
        # Get current date range
        today = datetime.now().date()
        start_date = today - timedelta(days=days)
        
        if view_mode == "patient_wise":
            # Patient-wise trends: return individual lines for each patient
            patient_trends = []
            
            for patient in patients:
                patient_id = str(patient["_id"])
                patient_name = patient.get("name", "Unknown")
                
                try:
                    # Get recovery metrics for this patient
                    metrics = get_recovery_metrics(patient_id, days=days)
                    daily_data = metrics.get("daily_scores", [])
                    
                    # Format patient's daily data
                    patient_daily = []
                    for day_entry in daily_data:
                        date_str = day_entry.get("date")
                        score = day_entry.get("composite_score")
                        if date_str and score is not None:
                            patient_daily.append({
                                "date": date_str,
                                "score": round(score, 1)
                            })
                    
                    if patient_daily:  # Only include patients with data
                        patient_trends.append({
                            "patient_id": patient_id,
                            "patient_name": patient_name,
                            "data": patient_daily
                        })
                except:
                    pass
            
            return {
                "view_mode": "patient_wise",
                "patient_trends": patient_trends,
                "total_patients": len(patient_trends)
            }
        
        else:
            # Cohort average: return single aggregated line
            # HashMap for date-based aggregation
            daily_scores = defaultdict(list)
            
            # Collect recovery scores for each patient
            for patient in patients:
                patient_id = str(patient["_id"])
                
                try:
                    # Get recovery metrics for this patient
                    metrics = get_recovery_metrics(patient_id, days=days)
                    daily_data = metrics.get("daily_scores", [])
                    
                    # Aggregate by date
                    for day_entry in daily_data:
                        date_str = day_entry.get("date")
                        score = day_entry.get("composite_score")
                        if date_str and score is not None:
                            daily_scores[date_str].append(score)
                except:
                    pass
            
            # Calculate average for each date
            trend_data = []
            current_date = start_date
            
            while current_date <= today:
                date_str = current_date.isoformat()
                
                if date_str in daily_scores and daily_scores[date_str]:
                    avg_score = sum(daily_scores[date_str]) / len(daily_scores[date_str])
                    trend_data.append({
                        "date": date_str,
                        "avg_score": round(avg_score, 1),
                        "patient_count": len(daily_scores[date_str])
                    })
                else:
                    # Include dates with no data for continuity
                    trend_data.append({
                        "date": date_str,
                        "avg_score": None,
                        "patient_count": 0
                    })
                
                current_date += timedelta(days=1)
            
            return {
                "view_mode": "cohort",
                "trend_data": trend_data,
                "total_patients": len(patients)
            }
        
    except Exception as e:
        print(f"Error in get_doctor_recovery_trends: {e}")
        return {"trend_data": [], "patient_trends": []}



def get_doctor_critical_alerts(doctor_id):
    """
    Get critical alerts using Min-Heap for priority
    DSA: Min-Heap (priority queue) for O(log n) insertion/extraction
    Time Complexity: O(n log n) where n = number of patients
    """
    import heapq
    from datetime import datetime
    
    try:
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        # Min-heap for priority alerts (priority, patient_name, alert_type, details)
        alerts_heap = []
        
        for patient in patients:
            patient_id = str(patient["_id"])
            patient_name = patient.get("name", "Unknown")
            
            # Check for recovery drops
            try:
                metrics = get_recovery_metrics(patient_id, days=7)
                # Priority 1: Sudden drops (highest priority)
                if metrics["warnings"] and len(metrics["warnings"]) > 0:
                    for warning in metrics["warnings"]:
                        heapq.heappush(alerts_heap, (
                            1,  # Priority 1 (highest)
                            patient_name,
                            "sudden_drop",
                            f"{patient_name}: Recovery score dropped sharply",
                            patient_id
                        ))
                
                # Priority 2: Declining trend
                if metrics["trend"]["direction"] == "declining":
                    heapq.heappush(alerts_heap, (
                        2,
                        patient_name,
                        "declining_trend",
                        f"{patient_name}: Recovery trend declining ({metrics['trend']['delta']}%)",
                        patient_id
                    ))
                
                # Priority 3: Low recovery score
                if metrics["current_score"] < 40:
                    heapq.heappush(alerts_heap, (
                        3,
                        patient_name,
                        "low_score",
                        f"{patient_name}: Low recovery score ({metrics['current_score']}%)",
                        patient_id
                    ))
            except:
                pass
            
            # Check for active pains (Priority 2)
            try:
                pain_history = get_patient_pain_history(patient_id)
                active_pains = [p for p in pain_history if p["status"] == "active"]
                
                if active_pains:
                    heapq.heappush(alerts_heap, (
                        2,
                        patient_name,
                        "active_pain",
                        f"{patient_name}: {len(active_pains)} active pain location(s)",
                        patient_id
                    ))
            except:
                pass
            
            # Check for overdue exercises (Priority 3)
            try:
                from datetime import datetime, timedelta
                exercises = get_patient_exercises(patient_id)
                
                # Filter overdue exercises from last 15 days
                fifteen_days_ago = (datetime.now() - timedelta(days=15)).date()
                recent_overdue = []
                
                for ex in exercises:
                    if ex.get("status") == "missed" and ex.get("assigned_date"):
                        try:
                            assigned_date = datetime.fromisoformat(ex["assigned_date"]).date()
                            if assigned_date >= fifteen_days_ago:
                                recent_overdue.append(ex)
                        except:
                            pass
                
                if len(recent_overdue) > 5: 
                    heapq.heappush(alerts_heap, (
                        3,
                        patient_name,
                        "overdue_exercises",
                        f"{patient_name}: {len(recent_overdue)} overdue exercises last 15 days",
                        patient_id
                    ))
            except:
                pass
        
        # Extract alerts from heap (sorted by priority)
        alerts = []
        while alerts_heap:
            priority, patient_name, alert_type, message, patient_id = heapq.heappop(alerts_heap)
            alerts.append({
                "priority": priority,
                "patient_name": patient_name,
                "type": alert_type,
                "message": message,
                "patient_id": patient_id,
                "severity": "high" if priority == 1 else "medium" if priority == 2 else "low"
            })
    
        return {
            "alerts": alerts[:5],  
            "total_count": len(alerts)
        }
        
    except Exception as e:
        print(f"Error in get_doctor_critical_alerts: {e}")
        return {"alerts": [], "total_count": 0}


def get_doctor_exercise_compliance(doctor_id, days=30):
    """
    Get exercise compliance metrics with trend data
    DSA: HashMap for O(1) aggregation + Binary search for date filtering
    """
    from collections import defaultdict
    from datetime import datetime, timedelta
    from bisect import bisect_left, bisect_right
    
    try:
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        # HashMap for aggregation
        total_completed = 0
        total_pending = 0
        total_missed = 0
        
        # Daily compliance tracking (for trend)
        daily_compliance = defaultdict(lambda: {"completed": 0, "total": 0})
        
        for patient in patients:
            patient_id = str(patient["_id"])
            
            try:
                assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
                if not assignment:
                    continue
                
                exercises = assignment.get("exercises", [])
                
                # Filter by date range
                from_date = (datetime.now() - timedelta(days=days)).date()
                today = datetime.now().date()
                
                for ex in exercises:
                    if ex.get("assigned_date"):
                        try:
                            ex_date = datetime.fromisoformat(ex["assigned_date"]).date()
                            
                            if from_date <= ex_date <= today:
                                status = ex.get("status", "pending")
                                date_str = ex_date.isoformat()
                                
                                # Aggregate totals
                                if status == "completed":
                                    total_completed += 1
                                    daily_compliance[date_str]["completed"] += 1
                                elif status == "pending":
                                    total_pending += 1
                                elif status == "missed":
                                    total_missed += 1
                                
                                daily_compliance[date_str]["total"] += 1
                        except:
                            pass
            except:
                pass
        
        # Calculate overall completion rate
        total_exercises = total_completed + total_pending + total_missed
        completion_rate = (total_completed / total_exercises * 100) if total_exercises > 0 else 0
        
        # Build trend data (sorted by date using binary search concept)
        sorted_dates = sorted(daily_compliance.keys())
        trend_data = []
        
        for date_str in sorted_dates:
            day_data = daily_compliance[date_str]
            day_rate = (day_data["completed"] / day_data["total"] * 100) if day_data["total"] > 0 else 0
            trend_data.append({
                "date": date_str,
                "rate": round(day_rate, 1),
                "completed": day_data["completed"],
                "total": day_data["total"]
            })
        
        return {
            "completion_rate": round(completion_rate, 1),
            "total_completed": total_completed,
            "total_pending": total_pending,
            "total_missed": total_missed,
            "total_exercises": total_exercises,
            "trend_data": trend_data
        }
        
    except Exception as e:
        print(f"Error in get_doctor_exercise_compliance: {e}")
        return {
            "completion_rate": 0,
            "total_completed": 0,
            "total_pending": 0,
            "total_missed": 0,
            "total_exercises": 0,
            "trend_data": []
        }


def get_doctor_pain_overview(doctor_id):
    """
    Get pain management overview across all patients
    DSA: HashMap for frequency counting + Sorting for top locations
    """
    from collections import defaultdict
    
    try:
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        # HashMap for status counting
        status_counts = {"active": 0, "recovering": 0, "recovered": 0}
        
        # HashMap for location frequency counting
        location_frequency = defaultdict(int)
        location_intensity = defaultdict(list)
        
        for patient in patients:
            patient_id = str(patient["_id"])
            
            try:
                pain_history = get_patient_pain_history(patient_id)
                
                for pain in pain_history:
                    # Count by status
                    status = pain.get("status", "unknown")
                    if status in status_counts:
                        status_counts[status] += 1
                    
                    # Count location frequency
                    body_part = pain.get("body_part", "Unknown")
                    location_frequency[body_part] += 1
                    location_intensity[body_part].append(pain.get("max_intensity", 0))
            except:
                pass
        
        # Sort locations by frequency (descending)
        sorted_locations = sorted(
            location_frequency.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Get top 5 with average intensity
        common_locations = []
        for location, count in sorted_locations[:5]:
            avg_intensity = sum(location_intensity[location]) / len(location_intensity[location])
            common_locations.append({
                "body_part": location,
                "count": count,
                "avg_intensity": round(avg_intensity, 1)
            })
        
        return {
            "active": status_counts["active"],
            "recovering": status_counts["recovering"],
            "recovered": status_counts["recovered"],
            "total_pain_reports": sum(status_counts.values()),
            "common_locations": common_locations
        }
        
    except Exception as e:
        print(f"Error in get_doctor_pain_overview: {e}")
        return {
            "active": 0,
            "recovering": 0,
            "recovered": 0,
            "total_pain_reports": 0,
            "common_locations": []
        }


def get_doctor_patient_risk_stratification(doctor_id):
    """
    Get patient risk stratification with sorting
    DSA: Priority Queue + QuickSort for ranking
    Time Complexity: O(n log n) for sorting
    """
    import heapq
    from datetime import datetime, timedelta
    
    try:
        patients = list(users_collection.find({"therapist": doctor_id, "role": "Patient"}))
        
        patient_risks = []
        
        for patient in patients:
            patient_id = str(patient["_id"])
            patient_data = {
                "patient_id": patient_id,
                "name": patient.get("name", "Unknown"),
                "email": patient.get("email", ""),
                "age": patient.get("age", 0),
                "recovery_score": 0,
                "trend": "insufficient_data",
                "trend_delta": 0,
                "active_pains": 0,
                "compliance_rate": 0,
                "last_activity": None,
                "risk_score": 0  # Calculated risk (0-100, higher = more at risk)
            }
            
            # Get recovery metrics
            try:
                metrics = get_recovery_metrics(patient_id, days=7)
                patient_data["recovery_score"] = round(metrics["current_score"], 1)
                patient_data["trend"] = metrics["trend"]["direction"]
                patient_data["trend_delta"] = metrics["trend"]["delta"]
            except:
                pass
            
            # Get pain history
            try:
                pain_history = get_patient_pain_history(patient_id)
                patient_data["active_pains"] = len([p for p in pain_history if p["status"] == "active"])
            except:
                pass
            
            # Get compliance rate
            try:
                exercises = get_patient_exercises(patient_id)
                if exercises:
                    completed = len([ex for ex in exercises if ex.get("status") == "completed"])
                    patient_data["compliance_rate"] = round((completed / len(exercises)) * 100, 1)
            except:
                pass
            
            # Get last activity date
            try:
                recent_activity = daily_activity_collection.find_one(
                    {"user_id": patient_id},
                    sort=[("date", -1)]
                )
                if recent_activity:
                    patient_data["last_activity"] = recent_activity.get("date")
            except:
                pass
            
            # Calculate risk score (higher = more at risk)
            # Factors: low recovery (40%), poor compliance (30%), active pains (20%), declining trend (10%)
            risk_score = 0
            risk_score += max(0, (100 - patient_data["recovery_score"]) * 0.4)  # Low recovery
            risk_score += max(0, (100 - patient_data["compliance_rate"]) * 0.3)  # Poor compliance
            risk_score += min(100, patient_data["active_pains"] * 10 * 0.2)  # Active pains
            risk_score += (20 * 0.1) if patient_data["trend"] == "declining" else 0  # Declining
            
            patient_data["risk_score"] = round(risk_score, 1)
            
            patient_risks.append(patient_data)
        
        # Sort by risk score (descending) - QuickSort is used internally by Python
        patient_risks.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return {
            "patients": patient_risks,
            "total_count": len(patient_risks)
        }
        
    except Exception as e:
        print(f"Error in get_doctor_patient_risk_stratification: {e}")
        return {"patients": [], "total_count": 0}

def get_patient_exercise_performance(patient_id, exercise_name=None):

    """
    Fetch detailed performance metrics for a specific completed exercise or ALL exercises if exercise_name is None.
    Returns list of session data for charts/analysis.
    """
    try:
        assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
        if not assignment:
            return []

        exercises = assignment.get("exercises", [])
        performance_data = []

        for ex in exercises:
            # Filter for completed specific exercises (e.g., "Plank") or ALL if exercise_name is None
            if ((exercise_name is None or ex.get("exercise_name") == exercise_name) and 
                ex.get("status") == "completed" and 
                ex.get("completed_at")):
                
                # Extract session stats if available
                stats = ex.get("session_stats", {})
                
                p_date = ex.get("assigned_date")
                if p_date:
                     if isinstance(p_date, str):
                         # If string, assume YYYY-MM-DD or ISO
                         p_date_str = p_date.split("T")[0]
                     else:
                         # If datetime/date object
                         p_date_str = p_date.strftime("%Y-%m-%d")
                else:
                     p_date_str = ex["completed_at"].strftime("%Y-%m-%d")

                data_point = {
                    "date": p_date_str,
                    "timestamp": ex["completed_at"].isoformat(),
                    "duration_seconds": ex.get("duration_minutes", 0) * 60, # Fallback if not in stats
                    "not_form_percentage": 0,
                    "total_predictions": 0,
                    "avg_confidence": 0,
                    "form_percentage": 0
                }

                # Enhance with detailed session stats if they exist
                if stats:
                    data_point["duration_seconds"] = stats.get("duration_seconds", data_point["duration_seconds"])
                    data_point["total_predictions"] = stats.get("total_predictions", 0)
                    data_point["avg_confidence"] = stats.get("average_confidence", 0)
                    
                    # Calculate Form Percentage (Good/Total)
                    correct = stats.get("average_count", 0)
                    incorrect = stats.get("not_average_count", 0)
                    total = correct + incorrect
                    
                    if total > 0:
                        data_point["form_percentage"] = round((correct / total) * 100, 1)
                        data_point["not_form_percentage"] = round((incorrect / total) * 100, 1)
                    
        
                    # Process time_series_data if available
                    # Check both root and session_stats
                    time_series = ex.get("time_series_data", [])
                    if not time_series and stats:
                        time_series = stats.get("time_series_data", [])
                
                    feedback_counts = {}
                    confidence_trend = []
                    
                    if time_series:
                        # Check if normalization is needed (if max confidence <= 1.0, it's likely 0-1 scale)
                        max_conf_raw = max([x.get("confidence", 0) for x in time_series]) if time_series else 0
                        scale_factor = 100.0 if max_conf_raw <= 1.0 and max_conf_raw > 0 else 1.0
                        
                        start_time = time_series[0].get("timestamp", 0)
                        
                        for frame in time_series:
                            # 1. Confidence Trend
                            # Relative time in seconds
                            t = frame.get("timestamp", 0) - start_time
                            conf = frame.get("confidence", 0) * scale_factor
                            
                            confidence_trend.append({"time": round(t, 1), "confidence": round(conf, 1)})
                            
                            # 2. Feedback Counts
                            # "✓ Wrists grounded | ✓ Elbows positioned | ✗ Head too high"
                            feedback_str = frame.get("feedback", "")
                            if feedback_str:
                                # Split by pipe and trim
                                parts = [p.strip() for p in feedback_str.split("|")]
                                for part in parts:
                                    feedback_counts[part] = feedback_counts.get(part, 0) + 1
                    
                    # --- NEW: Generate Feedback Timeline (Binned) ---
                    # Divide session into 10 bins for the Stacked Bar Chart
                    feedback_timeline = []
                    if time_series:
                        duration = time_series[-1].get("timestamp", 0) - start_time
                        if duration > 0:
                            num_bins = 10
                            bin_size = duration / num_bins
                            
                            # Initialize bins
                            bins = [{"time": f"{int(i * bin_size)}s", "Correct": 0} for i in range(num_bins)]
                            
                            # Populate bins
                            for frame in time_series:
                                t = frame.get("timestamp", 0) - start_time
                                bin_idx = min(int(t / bin_size), num_bins - 1)
                                
                                f_str = frame.get("feedback", "")
                                # Determine if frame is "Correct" (all checks passed or 'C') or has errors
                                # Heuristic: If string contains "✗", it's an error frame.
                                # If it only contains "✓" or is "C", it's correct.
                                if "✗" in f_str or "Incorrect" in f_str:
                                    # Extract specific errors
                                    parts = [p.strip() for p in f_str.split("|")]
                                    for part in parts:
                                        if "✗" in part or "Incorrect" in part or ("✓" not in part and "Correct" not in part and len(part) > 1):
                                            # Clean up the key, maybe remove '✗ ' prefix for cleaner legend?
                                            key = part.replace("✗", "").strip()
                                            bins[bin_idx][key] = bins[bin_idx].get(key, 0) + 1
                                else:
                                    bins[bin_idx]["Correct"] += 1
                                    
                            feedback_timeline = bins

                    # --- NEW: Posture Stability Timeline (Dual Line: Raw + Rolling Avg) ---
                    # Bin into max 60 intervals
                    posture_quality_timeline = []
                    if time_series:
                        start_time = time_series[0].get("timestamp", 0)
                        duration = time_series[-1].get("timestamp", 0) - start_time
                        
                        num_bins = 60
                        bin_size = max(duration / num_bins, 1.0)
                        
                        bins = [{"time_start": i * bin_size, "status_sum": 0, "count": 0} for i in range(num_bins)]
                        
                        for frame in time_series:
                            t = frame.get("timestamp", 0) - start_time
                            bin_idx = min(int(t / bin_size), num_bins - 1)
                            
                            f_str = frame.get("feedback", "")
                            is_stable = 0 if ("✗" in f_str or "Incorrect" in f_str) else 1
                            
                            bins[bin_idx]["status_sum"] += is_stable
                            bins[bin_idx]["count"] += 1
                        
                        # Process bins to calculate Raw Stability
                        raw_values = []
                        for b in bins:
                            if b["count"] > 0:
                                raw_val = b["status_sum"] / b["count"] # 0.0 to 1.0
                            else:
                                raw_val = 0 # Or carry forward? 0 is safer for "no data"
                            raw_values.append({"time": b["time_start"], "val": raw_val})
                            
                        # Calculate Rolling Average (Window = 5 bins approx 3-10 sec)
                        window_size = 5
                        for i, item in enumerate(raw_values):
                            # Get window slice
                            start_w = max(0, i - window_size + 1)
                            window = raw_values[start_w : i + 1]
                            avg_val = sum(x["val"] for x in window) / len(window)
                            
                            posture_quality_timeline.append({
                                "time": f"{int(item['time'])}s",
                                "raw_stability": round(item["val"] * 100, 1),      # Scale to 0-100%
                                "rolling_average": round(avg_val * 100, 1)         # Scale to 0-100%
                            })
                            
                            
                    # --- NEW: Radar Chart Metrics ---
                    # 1. Stability: Frames In Position / Total Frames
                    stability_score = 0
                    if total > 0:
                        stability_score = round((correct / total) * 100, 1) # Reuse Correct count
                        
                    # 2. Accuracy: (Average Count / Total Predictions) -> user definition
                    # Assuming "average_count" == correct frames as per current logic
                    accuracy_score = stability_score # Same as form_percentage in this context
                    
                    # 3. Confidence: Average Confidence
                    confidence_score = round(data_point["avg_confidence"] * 100, 1) if data_point["avg_confidence"] <= 1.0 else data_point["avg_confidence"]
                    
                    # 4. Pain Score: 100 - (Pain Intensity * 10)
                    pain_data = ex.get("pain_feedback", {})
                    pain_intensity = pain_data.get("pain_intensity", 0)
                    # If pain_intensity is None or string, handle it
                    try:
                        pain_intensity = float(pain_intensity) if pain_intensity is not None else 0
                    except:
                        pain_intensity = 0
                    pain_score = max(0, 100 - (pain_intensity * 10))
                    
                    # 5. Adherence: min((Actual / Prescribed) * 100, 100)
                    # Try to find target duration (hold_time or duration_minutes)
                    target_seconds = ex.get("target_hold_time", 0)
                    if not target_seconds:
                         # Fallback to duration_minutes * 60 if available and intended as target
                         # Often 'duration_minutes' in assignment is the target.
                         target_seconds = ex.get("duration_minutes", 0) * 60
                         
                    actual_seconds = data_point["duration_seconds"]
                    
                    if target_seconds > 0:
                        adherence_score = min(round((actual_seconds / target_seconds) * 100, 1), 100)
                    else:
                        # If no target, assume 100% if some exercise was done
                        adherence_score = 100 if actual_seconds > 0 else 0

                    radar_data = [
                        {"subject": "Stability", "A": stability_score, "fullMark": 100},
                        {"subject": "Accuracy", "A": accuracy_score, "fullMark": 100},
                        {"subject": "Confidence", "A": confidence_score, "fullMark": 100},
                        {"subject": "Pain Score", "A": pain_score, "fullMark": 100},
                        {"subject": "Adherence", "A": adherence_score, "fullMark": 100}
                    ]

                    # --- NEW: Risk Analysis (Instability, Fatigue, Pain) ---
                    # 1. Instability Factor (0-100)
                    instability_factor = max(0, 100 - stability_score)
                    
                    # 2. Fatigue Factor (0-100)
                    # Logic: Drop in Rolling Average from Peak to End
                    fatigue_factor = 0
                    if posture_quality_timeline:
                        rolling_vals = [x["rolling_average"] for x in posture_quality_timeline]
                        max_roll = max(rolling_vals) if rolling_vals else 0
                        end_roll = rolling_vals[-1] if rolling_vals else 0
                        fatigue_factor = max(0, max_roll - end_roll)
                    
                    # 3. Pain Factor (0-100)
                    pain_factor = min(pain_intensity * 10, 100)
                    
                    # Weighted Risk Score
                    # Weights: Instability (40%), Fatigue (30%), Pain (30%)
                    risk_score = (instability_factor * 0.4) + (fatigue_factor * 0.3) + (pain_factor * 0.3)
                    risk_score = round(min(max(risk_score, 0), 100), 1)
                    
                    risk_analysis = {
                        "score": risk_score,
                        "factors": [
                            {"name": "Instability", "value": round(instability_factor, 1), "fill": "#8884d8"},
                            {"name": "Fatigue", "value": round(fatigue_factor, 1), "fill": "#82ca9d"},
                            {"name": "Pain", "value": round(pain_factor, 1), "fill": "#ffc658"},
                        ]
                    }

                    # Convert feedback_counts to list for frontend Recharts (Legacy/Summary usage)
                    data_point["feedback_breakdown"] = [
                        {"name": k, "count": v, "type": "error" if "✗" in k else "success"} 
                        for k, v in feedback_counts.items()
                    ]
                    data_point["feedback_breakdown"].sort(key=lambda x: x["count"], reverse=True)
                    
                    data_point["confidence_trend"] = confidence_trend
                    data_point["feedback_timeline"] = feedback_timeline
                    data_point["posture_quality_timeline"] = posture_quality_timeline
                    data_point["radar_metrics"] = radar_data
                    data_point["risk_analysis"] = risk_analysis
                
                performance_data.append(data_point)

        # Sort by date descending (newest first)
        performance_data.sort(key=lambda x: x["timestamp"], reverse=True)
        return performance_data

    except Exception as e:
        print(f"Error fetching performance data: {e}")
        return []

def get_patient_overall_reports(patient_id):
    """
    Calculate aggregate statistics for the Patient Reports Dashboard.
    Scans ALL completed exercises.
    """
    try:
        assignment = assigned_exercises_collection.find_one({"patient_id": patient_id})
        if not assignment:
             return None

        exercises = assignment.get("exercises", [])
        
        total_sessions = 0
        total_accuracy_sum = 0.0
        total_confidence_sum = 0.0
        pain_incidents_count = 0
        max_reps_streak = 0
        total_duration_seconds = 0.0
        
        # New: Lists to hold trend data
        performance_history = []
        confidence_history = []
        pain_hierarchy = {} # { "Squat": { "total": 10, "children": {"Knee": 5} } }
        
        for ex in exercises:
            # Filter for completed exercises
            if ex.get("status") == "completed" and ex.get("completed_at"):
                total_sessions += 1
                stats = ex.get("session_stats", {})
                
                # Date for Trend Data
                # Robustly handle different date keys and formats
                p_date = ex.get("assigned_date") or ex.get("assigned_at")
                
                date_str = None
                timestamp_iso = ""
                
                # Try assigned date first
                if p_date:
                     if isinstance(p_date, str):
                         date_str = p_date.split("T")[0]
                     elif hasattr(p_date, 'strftime'):
                         date_str = p_date.strftime("%Y-%m-%d")
                
                # Fallback to completed_at
                if not date_str:
                    comp_at = ex.get("completed_at")
                    if comp_at:
                        if isinstance(comp_at, str):
                            date_str = comp_at.split("T")[0]
                            timestamp_iso = comp_at
                        elif hasattr(comp_at, 'strftime'):
                            date_str = comp_at.strftime("%Y-%m-%d")
                            timestamp_iso = comp_at.isoformat()
                    else:
                        # Should not happen due to filter, but safe fallback
                        date_str = "Unknown"
                        timestamp_iso = ""
                else:
                    # Ensure we have a timestamp for sorting
                    comp_at = ex.get("completed_at")
                    if comp_at:
                        if isinstance(comp_at, str):
                            timestamp_iso = comp_at
                        elif hasattr(comp_at, 'isoformat'):
                             timestamp_iso = comp_at.isoformat()
                
                # 1. Accuracy (Form Percentage) & Counts for Bar Chart
                correct = stats.get("average_count", 0)
                incorrect = stats.get("not_average_count", 0)
                total_frames = correct + incorrect
                if total_frames > 0:
                    accuracy = (correct / total_frames) * 100
                else:
                    accuracy = 0
                total_accuracy_sum += accuracy
                
                # Add to performance history
                performance_history.append({
                    "date": date_str,
                    "correct": correct,
                    "incorrect": incorrect,
                    "accuracy": round(accuracy, 1),
                    "timestamp": timestamp_iso
                })
                
                # 2. Confidence
                # Check if confidence is 0-1 or 0-100. Assume 0-1 if <= 1.0
                conf = stats.get("average_confidence", 0)
                if conf <= 1.0 and conf > 0:
                    conf *= 100
                total_confidence_sum += conf
                
                # Add to confidence history
                confidence_history.append({
                    "date": date_str,
                    "confidence": round(conf, 1),
                    "timestamp": timestamp_iso
                })
                
                # 3. Pain Incidents
                pain_data = ex.get("pain_feedback", {})
                # Handle varying types safely
                p_int = pain_data.get("had_pain")
                if p_int:
                    pain_incidents_count += 1
                    
                # NEW: Pain Hierarchy for Sunburst Chart
                # Structure: Exercise -> Locations
                # If multiple locations, split intensity evenly
                locations = pain_data.get("pain_locations", [])
                session_intensity = pain_data.get("pain_intensity", 0)
                ex_name = ex.get("exercise_name", "Unspecified Exercise")
                
                try:
                    session_intensity = float(session_intensity)
                except:
                    session_intensity = 0
                
                if session_intensity > 0:
                     if ex_name not in pain_hierarchy:
                         pain_hierarchy[ex_name] = {"total": 0, "children": {}}
                     
                     pain_hierarchy[ex_name]["total"] += session_intensity
                     
                     if locations and isinstance(locations, list) and len(locations) > 0:
                         share = session_intensity / len(locations)
                         for loc in locations:
                             pain_hierarchy[ex_name]["children"][loc] = pain_hierarchy[ex_name]["children"].get(loc, 0) + share
                     else:
                         # No specific location, assign to "General"
                         pain_hierarchy[ex_name]["children"]["General"] = pain_hierarchy[ex_name]["children"].get("General", 0) + session_intensity
                    
                # 4. Longest Streak (Max Reps in single session)
                if stats.get("average_count", 0) > max_reps_streak:
                    max_reps_streak = stats.get("average_count", 0)
                
                # 5. Duration
                # Prefer stats duration (seconds), fallback to assignment duration (minutes)
                dur = stats.get("duration_seconds", 0)
                if not dur:
                    dur = ex.get("duration_minutes", 0) * 60
                total_duration_seconds += dur

        # Calculate Averages
        if total_sessions > 0:
            avg_accuracy = round(total_accuracy_sum / total_sessions, 1)
            mean_confidence = round(total_confidence_sum / total_sessions, 1)
            avg_duration = round(total_duration_seconds / total_sessions, 0)
        else:
            avg_accuracy = 0
            mean_confidence = 0
            avg_duration = 0
            

        
        # Sort history by date (oldest to newest for charts)
        performance_history.sort(key=lambda x: x["timestamp"])
        confidence_history.sort(key=lambda x: x["timestamp"])
        
        # Format Pain Hierarchy Data for Sunburst
        pain_sunburst_data = []
        for ex_name, data in pain_hierarchy.items():
            children = []
            for loc_name, loc_val in data["children"].items():
                children.append({
                    "name": loc_name,
                    "value": round(loc_val, 1)
                })
            
            # Sort children by value desc
            children.sort(key=lambda x: x["value"], reverse=True)
            
            pain_sunburst_data.append({
                "name": ex_name,
                "value": round(data["total"], 1),
                "children": children
            })
        
        # Sort exercises by total value desc
        pain_sunburst_data.sort(key=lambda x: x["value"], reverse=True)
            
        return {
            "totalSessions": total_sessions,
            "avgAccuracy": avg_accuracy,
            "meanConfidence": mean_confidence,
            "painIncidents": pain_incidents_count,
            "longestStreak": max_reps_streak,
            "avgDuration": avg_duration,
            "performance_history": performance_history,
            "confidence_history": confidence_history,
            "pain_sunburst_data": pain_sunburst_data
        }

    except Exception as e:
        print(f"Error in get_patient_overall_reports: {e}")
        return None


        
def get_user_by_id(user_id):
    """Get user information by user_id"""
    try:
        from bson import ObjectId
        
        user_doc = doctors_collection.find_one({"_id": ObjectId(user_id)})
        
        if user_doc:
            return {
                "name": user_doc.get("name", "Unknown"),
                "email": user_doc.get("email", ""),
                "profile_picture": user_doc.get("profile_picture"),
            }
        return None
        
    except Exception as e:
        print(f"Error in get_user_by_id: {e}")
        return None

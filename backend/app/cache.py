

from . import cache


def get_cached_dashboard_stats():
    """Get cached dashboard statistics or calculate and cache them"""
    cache_key = 'dashboard_stats'
    cached_data = cache.get(cache_key)

    if cached_data is not None:
        return cached_data

    # Cache miss - calculate from database
    from .auth.models import User
    from .student.models import Student
    from .program.models import Program
    from .college.models import College

    try:
        total_students = Student.count_students()
        total_programs = len(Program.get_all_programs())
        total_colleges = len(College.get_all_colleges())

        stats = {
            "total_students": total_students,
            "total_programs": total_programs,
            "total_colleges": total_colleges
        }

        # Cache the result
        cache.set(cache_key, stats, timeout=600)  # 10 minutes
        return stats

    except Exception as e:
        print(f"Error calculating dashboard stats: {e}")
        return {
            "total_students": 0,
            "total_programs": 0,
            "total_colleges": 0
        }


def get_cached_dashboard_program_charts():
    """Get cached program chart data or calculate and cache them"""
    cache_key = 'dashboard_program_charts'
    cached_data = cache.get(cache_key)

    if cached_data is not None:
        return cached_data

    # Cache miss - get from Program model
    from .program.models import Program

    try:
        program_stats = Program.get_program_stats()
        students_by_program = [
            {
                "program_code": prog['code'],
                "program_name": prog.get('name', 'Unknown'),
                "student_count": prog.get('student_count', 0)
            }
            for prog in program_stats or []
        ]

        # Cache the result
        cache.set(cache_key, students_by_program, timeout=600)  # 10 minutes
        return students_by_program

    except Exception as e:
        print(f"Error calculating program chart data: {e}")
        return []


def get_cached_dashboard_college_charts():
    """Get cached college chart data or calculate and cache them"""
    cache_key = 'dashboard_college_charts'
    cached_data = cache.get(cache_key)

    if cached_data is not None:
        return cached_data

    # Cache miss - get from College model
    from .college.models import College

    try:
        college_stats = College.get_college_stats()
        students_by_college = [
            {
                "college_code": col['college_code'],
                "college_name": col['college_name'],
                "student_count": col.get('student_count', 0)
            }
            for col in college_stats or []
        ]

        # Cache the result
        cache.set(cache_key, students_by_college, timeout=600)  # 10 minutes
        return students_by_college

    except Exception as e:
        print(f"Error calculating college chart data: {e}")
        return []


def clear_dashboard_cache():
    """Clear all dashboard-related cache entries (call after CRUD operations)"""
    try:
        cache.delete('dashboard_stats')
        cache.delete('dashboard_program_charts')
        cache.delete('dashboard_college_charts')
        print("✅ Dashboard cache cleared")
    except Exception as e:
        print(f"Error clearing dashboard cache: {e}")


def get_cache_info():
    """Get information about current cache status"""
    return {
        'cache_config': cache.config if hasattr(cache, 'config') else 'N/A',
        'cache_type': cache.cache._cache.__class__.__name__ if hasattr(cache, 'cache') else 'N/A'
    }

from datetime import datetime, timezone

# Shoutout to gippity for this nice func
def convert_utc_to_local(utc_timestamp: str) -> str:
    """
    Given a UTC timestamp like "2025-06-06 00:16:33", parse it as UTC and return
    an ISO-8601 string in the local timezone of the machine running this code.
    """
    
    # 1. Parse the string and mark it as UTC
    dt_utc = datetime.strptime(utc_timestamp, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    
    # 2. Convert to local timezone (None tells Python to use the system’s local tz)
    dt_local = dt_utc.astimezone()
    
    # 3. Return an ISO-formatted string (e.g. "2025-06-05T20:16:33-04:00" if your local tz is EDT)
    return dt_local.isoformat()
"""
Post today's weather (high/low + conditions) to a Vestaboard every morning.

Setup:
1. pip install vesta requests
2. Get a Cloud API token: Vestaboard mobile app > Advanced Settings > Cloud API
   (or web app > Developer section) - give it Read and Write permissions
3. Set the VESTABOARD_API_TOKEN environment variable (see run instructions below)
4. Adjust LATITUDE / LONGITUDE for your board's location
5. Run it once to test: python vestaboard_weather.py
6. Schedule it (cron, Task Scheduler, or GitHub Actions - see notes at bottom)
"""

import os
import json
import datetime
import requests
import vesta
from google.oauth2 import service_account
from googleapiclient.discovery import build

# --- Configuration ---------------------------------------------------------

LATITUDE = 40.7579   # New York, NY -- change to your location
LONGITUDE = -73.9814

CALENDAR_IDS = [
    "andrew.yi89@gmail.com",      # your main calendar
    "liiaang@gmail.com",    # the second one you shared
]
MAX_EVENTS = 4           # how many events fit alongside the weather

API_TOKEN = os.environ.get("VESTABOARD_API_TOKEN")
GOOGLE_CREDS_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")

# Open-Meteo weather codes -> short description
# https://open-meteo.com/en/docs
WEATHER_CODES = {
    0: "CLEAR", 1: "MOSTLY CLEAR", 2: "PARTLY CLOUDY", 3: "CLOUDY",
    45: "FOG", 48: "FOG",
    51: "LIGHT DRIZZLE", 53: "DRIZZLE", 55: "HEAVY DRIZZLE",
    61: "LIGHT RAIN", 63: "RAIN", 65: "HEAVY RAIN",
    71: "LIGHT SNOW", 73: "SNOW", 75: "HEAVY SNOW",
    80: "RAIN SHOWERS", 81: "RAIN SHOWERS", 82: "HEAVY SHOWERS",
    95: "THUNDERSTORMS", 96: "THUNDERSTORMS", 99: "THUNDERSTORMS",
}


def get_weather():
    """Fetch today's high/low and conditions from Open-Meteo (no API key needed)."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "temperature_unit": "fahrenheit",
        "timezone": "auto",
        "forecast_days": 1,
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()["daily"]

    high = round(data["temperature_2m_max"][0])
    low = round(data["temperature_2m_min"][0])
    code = data["weathercode"][0]
    condition = WEATHER_CODES.get(code, "")

    return high, low, condition


def get_agenda():
    """Fetch today's events from Google Calendar via a service account."""
    if not GOOGLE_CREDS_JSON:
        return []

    creds_info = json.loads(GOOGLE_CREDS_JSON)
    scopes = ["https://www.googleapis.com/auth/calendar.readonly"]
    creds = service_account.Credentials.from_service_account_info(
        creds_info, scopes=scopes
    )
    service = build("calendar", "v3", credentials=creds)

    now = datetime.datetime.now(datetime.timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    all_events = []
    for calendar_id in CALENDAR_IDS:
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=start_of_day.isoformat(),
            timeMax=end_of_day.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        all_events.extend(events_result.get("items", []))

    # Sort combined events from both calendars by start time
    def sort_key(event):
        start = event["start"].get("dateTime", event["start"].get("date"))
        return start

    all_events.sort(key=sort_key)

    BOARD_WIDTH = 22  # flagship Vestaboard is 22 characters wide

    events = []
    for event in all_events[:MAX_EVENTS]:
        start = event["start"].get("dateTime", event["start"].get("date"))
        title = event.get("summary", "Untitled")
        if "T" in start:  # timed event
            time_str = datetime.datetime.fromisoformat(start).strftime("%-I:%M%p").lower()
            line = f"{time_str} {title}"
        else:  # all-day event, no time prefix
            line = title
        events.append(line[:BOARD_WIDTH])

    return events


def build_message(high, low, condition, events):
    """Format a short message that fits the 6x22 Vestaboard."""
    lines = [
        f"{condition}  HI {high} LO {low}",
    ]
    if events:
        lines.extend(events)
    else:
        lines.append("NO EVENTS TODAY")
    return "\n".join(lines[:6])  # board only has 6 rows


def main():
    if not API_TOKEN:
        raise SystemExit("Set the VESTABOARD_API_TOKEN environment variable first.")

    high, low, condition = get_weather()
    events = get_agenda()
    message_text = build_message(high, low, condition, events)
    print("Posting:\n" + message_text)

    client = vesta.CloudClient(API_TOKEN)
    client.write_message(message_text)


if __name__ == "__main__":
    main()

# --- Scheduling notes --------------------------------------------------------
# Cron (Linux/Mac/Pi), runs 6:30am daily:
#   30 6 * * * VESTABOARD_API_TOKEN=your_token /usr/bin/python3 /path/to/vestaboard_weather.py
#
# GitHub Actions (free, no device needed):
#   Put this script in a repo, add a .github/workflows/weather.yml with a
#   `schedule: cron` trigger, and store VESTABOARD_API_TOKEN as a repo secret.
#   Ask me and I can generate that workflow file for you.

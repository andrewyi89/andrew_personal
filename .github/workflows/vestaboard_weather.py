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
import requests
import vesta

# --- Configuration ---------------------------------------------------------

LATITUDE = 40.7579   # New York, NY -- change to your location
LONGITUDE = -73.9814

API_TOKEN = os.environ.get("VESTABOARD_API_TOKEN")

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


def build_message(high, low, condition):
    """Format a short message that fits the 6x22 Vestaboard."""
    lines = [
        "TODAY'S WEATHER",
        "",
        condition,
        "",
        f"HIGH: {high} F",
        f"LOW:  {low} F",
    ]
    return "\n".join(lines)


def main():
    if not API_TOKEN:
        raise SystemExit("Set the VESTABOARD_API_TOKEN environment variable first.")

    high, low, condition = get_weather()
    message_text = build_message(high, low, condition)
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

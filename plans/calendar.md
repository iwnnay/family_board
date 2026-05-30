# Calendar
Calendar entries will be disaplyed in two areas. The calendar page and in a grid across the bottom of the main page.

## Main Page
Like chores, there will be a grid of small boxes on the main page
- Oriented to the botom of the page
- Scroll endlessly to the right
- Will only show calendar entries for the next 3 months
- Will be sorted by date and only visible from today into the future
- Calendar entries will display the following information in the grid format:
    - Date
    - Title
- When clicked calendar entries will display the show calendar entry modal

## Calendar Page
This will be a calendar for the current month.
- There will be buttons to navigate to the previous and next months
- Each day will tell you events for that day, if any
- There will be a bar across the bottom that is similar to the main page

### When a day is clicked
a modal will pop displaying the day's events
- The events will be sorted by time in the day
- Each event will show the following information:
    - Date (time range)
    - Title
    - Location
    - Description
- If an event is clicked it will show the calendar entry create/update modal

## The Calendar entry modal
- In the upper right corner
    - edit button
    - duplicate button: Creates a new calendar entry with the same information but for today's date
    - close button 
- It will display the following information:
    - Date (time range)
    - Title
    - Location: This can be clicked to go to google maps
    - Description

## The Calendar entry create/update modal
- In the upper right corner
    - save button
    - delete button, if you're the creator of the calendar entry
    - close button
- A form for editing/creating the calendar entry
  - Date & Time: A date and time picker
  - Duration: Dropdown of 15-minute increments over 12 hours
  - Title: A text input
  - Location: This will be a dropdown of locations and the ability to create a new location
  - Description: A text area

## Location Management Page
This page is going to be very straight forward.
- A list of locations
- A button along the top to create a new location
- A location is the following fields:
  - name: string
  - address: string
- Action buttons for editing and deleting locations
- is_deleted locations will not be displayed

## Database Tables
### Calendar Entries
| Field | Type | Notes |
| --- | --- | --- | 
| id | int | |
| title | string | |
| location_id | int | |
| start_time | datetime | |
| end_time | datetime | Determined by adding the duration to the start time
| description | string | |
| created_by | int | |

### Locations
| Field       | Type |
|-------------| --- |
| id          | int |
| name        | string |
| address     | int |
| is_deleted | |

# Calendar Events
An Event will be cast when a calendar entry
- created
- updated
- deleted
The related info will be:
- rel_type: Cal Event
- rel_id: calendar entry id
- message: `{title} at {formatted_date_starttime}`

Clicking the event will open the calendar entry modal.

---

# Recurring & All-Day Events  _(implemented)_

## Recurring Events
A calendar entry can repeat **weekly**, **every 2 weeks (biweekly)**, **monthly**, or **yearly** (or not at all). The "Repeats" dropdown on the create/update modal sets the rule, with an optional "Until" date.

Recurrence is **materialised**: rather than storing a rule and expanding it on every read, each occurrence is a real row. All occurrences of one series share a `series_id` (the id of the first occurrence). The earliest occurrence is the *head* (`is_series_head = 1`) and carries the rule (`recurrence`, `recurrence_end`) plus `generated_until` — the point through which the series has been generated.

- **Horizon** — series are generated **2 years** ahead (`HORIZON_DAYS = 730` in `queries/calendar.js`).
- **Date math** — `src/lib/recurrence.js` (`generateOccurrences`) steps in UTC off the original anchor, so monthly/yearly clamp short months (Jan 31 → Feb 28) without drifting (the next month is still the 31st).
- **Edit / delete are "this and following" only.** Editing or deleting a recurring occurrence splits the series at that point: the old series is capped at `recurrence_end = day before the occurrence`, and a new (edited) series is created from the occurrence forward. Earlier occurrences are never touched. Editing/deleting the **first** occurrence therefore rewrites/removes the whole series. The modal shows "↻ Changes apply to this and all future occurrences."

### Self-healing horizon
A background top-up keeps every series ~2 years ahead:
- **On writes** — the calendar save action calls `healCalendarSeries()` (cheap; a no-op when nothing is due).
- **Cron** — `GET|POST /api/calendar/heal` materialises any missing occurrences for every active series. Wire a **monthly** host cron to hit it.

## All-Day Events
An "All-day event" toggle on the modal hides the time/duration inputs and shows date pickers (with an optional end date for multi-day spans). All-day dates are **floating** — stored verbatim as `YYYY-MM-DD 00:00:00` and read straight from the string, with **no timezone conversion**, so the date never drifts. All-day events render as a solid banner pinned above timed events in the month grid and day list.

---

# Read-Only API  _(implemented)_

A GET-only JSON feed for external consumers (the hub display). **A token is always required** — set `CALENDAR_API_TOKEN`; unset means every request is denied. Supply it via `Authorization: Bearer <token>` or `?token=<token>`. `/api` is whitelisted in `hooks.server.js` so it bypasses the session redirect; the shared guard is `src/lib/server/api-auth.js`.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/calendar?days=14` | Upcoming occurrences (default 14 days; or `?from=YYYY-MM-DD&to=YYYY-MM-DD`). Returns `{ from, to, events[] }`. |
| `GET\|POST /api/calendar/heal` | Roll every series forward to the horizon. Returns `{ ok, healed, generated }`. |

Each event includes: `id, title, start_time, end_time, all_day, description, location_name, location_address, created_by, created_by_color, recurrence, is_recurring`.

---

## Database Tables (updated)

`calendar_entries` gained the following columns:

| Field | Type | Notes |
| --- | --- | --- |
| all_day | int | 1 = all-day (floating `YYYY-MM-DD 00:00:00`) |
| series_id | int | groups a recurring series; null = standalone one-off |
| is_series_head | int | 1 on the first occurrence (carries the rule) |
| recurrence | string | `none` \| `weekly` \| `biweekly` \| `monthly` \| `yearly` (denormalised onto every occurrence) |
| recurrence_end | string | inclusive last date a series may produce an occurrence; null = horizon |
| generated_until | string | start_time through which the series is materialised (head only) |

New SQLite columns are backfilled automatically via `ensureColumn` in `db.js`; MySQL/prod needs `yarn db:push`.

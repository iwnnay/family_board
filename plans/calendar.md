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
- updated.
The related info will be:
- rel_type: Cal Event
- rel_id: calendar entry id
- message: `{title} at {formatted_date_starttime}`

Clicking the event will open the calendar entry modal.

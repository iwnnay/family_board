# Notes Section
Unlike other sections notes will be maintained from the notes area and DOES NOT have a management section.

# Notes Page
This is a full CRUD for notes.

## Model
All notes field are optional. An ID will be used to track the notes once they're created.
All tables will have a created_at and updated_at field.

### Notes Table
- id
- title
- summary - string
- color 
- created_by

### Note Bodies Table
- id
- subtitle
- note_id
- body 

notes have a one to many relationship with the note bodies table.

### user_pins
- user_id
- rel_id
- rel_type
- is_global

### recent_events
- event_id
- type: note, chore_update
- message: string
- rel_id
- rel_type
- action

## When there are no notes
There will be a grayed out note to "Create a new note".

## Creating a new note
1. Click on the "Create a new note" button
2. A modal shows up over the page with the form
2. A form is shown 
   - with the title of the note
   - color picker
   - A subtitle is shown
   - A textarea for the body of the note
   - A plus at the bottom to add more bodies
     - If the plus is clicked then a subtitle and body are shown
   - A save button in the lower right
   - A cancel button in the lower left
   - A clear buttins in the upper right which will clear the form and only show one body form
1. Clicking cancel will save the contents of the forms into a cookie in case the person comes back and changes their mind.
2. Clicking save will save the contents of the forms into the database and display the note on the page.

## When there are notes
Notes will be displayed in a grid fashion.
Pinned notes will be displayed first.
The following notes will be sorted by the date they were created.
The "Create a new note" will never leave the page.
The grid notes will show the title, the pin/unpin button, the date last updated, and the sumamry.
The grid notes will also show the color of the note with a darkened color for the border.

## When a note is clicked
The note will be displayed in a modal.

### Read Mode
- The pin/unpin button will be in the upper right
- The delete button will be in the upper right if you're the original author of the note
  - Before you delete a note you will be asked to confirm
- The edit button will be in the upper right
- The edit button will toggle the user into edit mode.

Going down the left
1. The title is shown larger and bolder than other text.
2. The last updated date is shown in a smaller font, grayed out
3. Then there are the note bodies
    - The subtitle is show boldened
    - The body is show in regular font

### Edit mode
which will be exactly like the create mode, but prepopulated with the note's bodies.

# Events
Events will be displayed on the notes page in a horizontal bar over the chores.
They will be much smaller and with bold font.
It will be a series of blocks with like:
```
|---------------------|
| Note Created: Elroy |
| 12:00 PM            |
|---------------------|
````
The message will be the `{rel_type} {action}: {title}`
Notes will cast events when they're created or updated.
The time will be a 12 hour format with AM/PM.
Events will not be displayed if they are older than 30 days
If you click the event it will take you to the notes page and open the note that was created or updated in the modal in read mode.

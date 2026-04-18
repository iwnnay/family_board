# Lists Page
## List Page Content
This will be a series of todo lists in a scrollable grid from left to right.
- There will only be one list in a column
- They will be sorted by the last updated date
- Near the top there will be a button to create a new list next to title input

## A list
A list will have a the folowing:
- Title
- Delete button in upper right that needs to be confirmed and is only visble to the creator of the list
- Checkboxed list of items to complete
- Add Item field and button
- Completed items with restore button and will be sorted by when they were completed

## Database tables
### lists
| field       | type |
|-------------| --- |
| id          | int |
| title       | varchar |
| created_by | int |
| created_at  | datetime |
| updated_at  | datetime |

### list_items
| field        | type     |
|--------------|----------|
| id           | int      |
| list_id      | int      |
| item         | varchar  |
| completed_at | datetime |


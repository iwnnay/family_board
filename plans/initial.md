# Family Board

## Left Nav
At the top:
- Main
- Stats

Collapsed at the bottom under "Settings":
- Manage Chores
- Manage Family button

## Main Screen
There we be a grid of chores that need to be completed in tiny boxes

In the upper right hand corner there is a dropdown that says "Who dis?" and it's a dropdown of the family members. That family member then gets assigned as the preson who completes chores, the selection is stored in the browser's cookie.

The chore grid will automatically wrap and start with the none recurring chores, then it'll list the daily, weekly, monthly, yearly recurring chores, then recently (2 days) completed tasks.

When a chore is clicked, if a family member is not selected then you'll be asked which family member you are and the answer will be stored in the cookie. If it knows which family member then that family member is marked as the doer on the chore and the completed_at datetime is marked. The item is then sorted to the bottom of the list.

A completed chore record is created and the chore is checked against the chores from within the same frequency and are hidden from the list.

In the end it will appear to the user that when you click on a chore it is completed and moved to the end of the list. In the code, the chore completed item will be use to track the last time a chore was completed and not show chores accordinly.

## Stats Page
This is a quick page to show which family has:
- completed the most chores from daily chores
- Completed the most chores this month
- Number of chores that currently need to be completed

## Manage Chores
At the top of the page will be a form a new chore.

At the bottom will be the list of the chores. The list can be clicked on to change the form at the top into an update form and the page is scrolled to the top to change it. 

The list items will have all the fields from the chores

## Database
### Chores model
| column | type | note |
| - | - | -|
| id | int | ID for chore |
| name | string | This is the name of the chore
| frequency | enum | None, Daily, Weekly, Monthly, Yearly |
| suggested_day | string | Input from user | 

### ChoresCompleted model
| column | type | note |
| - | - | -|
| id | int | ID for core_completed |
| chore_id | int | Foreign key to chores table |
| completed_by | int | Foreign key to doers table |
| completed_at | datetime | Indicates when the chore was completed |

### Family model
| column | type | note |
| - | - | -|
| id | int | ID for family member |
| name | Name of family member |


## Tech Stack
This will be a svelte app with a sqllite database.

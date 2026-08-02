# Lists Page

## List Page Content

Todo lists tiled across the page in a responsive grid.

- Lists flow onto new rows and the page scrolls **down** — never sideways
- On mobile they stack into a single column
- Favourited lists sort to the top; the rest are sorted by last updated date
- Near the top there is a button to create a new list next to a title input,
  plus **Collapse all / Expand all** controls

## A list

A list has the following:

- Title
- Favourite (star) toggle in the upper left — per family member, floats the list to the top
- Collapse toggle — clicking the title hides the body, leaving only the header
- Delete button in the upper right that needs to be confirmed, visible to the creator
  (lists with no recorded creator can be deleted by anyone)
- Checkboxed list of items to complete
- Add Item field and button
- Completed items with a restore checkbox, sorted by when they were completed

Collapsed state is a per-browser preference (`localStorage`), not shared family state.

## An item

- Text, editable after the fact
- Due date (floating `YYYY-MM-DD` — no time-of-day, so it never shifts timezone)
- Priority: `high` | `medium` | `low` | `none`
- Assigned family member, defaulting to whoever added the item
- Notes
- Ordered steps, each independently checkable
- One optional photo
- Can be moved to a different list

Clicking an item opens the edit modal; the row itself expands to show the photo,
notes and steps inline.

### Ordering

Active items sort by:

1. Due date ascending — undated items last
2. Priority: high → medium → low → none
3. Insertion order

Implemented as a pure function (`sortListItems` in `src/lib/list-items.js`) so the
same ordering is testable and usable on both sides of the wire.

### Natural-language due dates

Typing a time phrase into the add box strips it from the text and turns it into a
due date:

    "Clean the gutter by Thursday" → item "Clean the gutter", due the next calendar Thursday

This lives in `src/lib/due-date.js` and is a **work in progress** — the grammar is
meant to grow. Callers only ever see `{ text, dueDate, matched }`, so adding rules
is the only change needed to understand more phrasings.

Understood today:

- Weekday names, with or without a lead-in (`by`, `on`, `due`, `before`, `next`, …)
- Weekday abbreviations, lead-in required
- `today`, `tonight`, `tomorrow`
- `next week`, `next month`
- `in N days`, `in N weeks`

Two guard rails keep it from mangling ordinary wording: a bare weekday only counts
at the very end of the item ("Buy Sunday roast" keeps its Sunday), and abbreviations
need a lead-in word ("where I sat" keeps its "sat").

Still to add: explicit dates ("Aug 21", "8/21"), times of day, "end of the month",
"this weekend", and surfacing what was matched back to the user so it can be undone.

## Images

Item photos are converted to WebP by `sharp`, fit inside 800 × 800, and written to
`static/store/images/lists/`. The file is deleted when the photo is replaced, when
the item is deleted, and **when the list the item belongs to is deleted** —
`deleteList` returns the filenames of every image it orphaned so the route action
can unlink them.

## Database tables

### lists

| field      | type     |
| ---------- | -------- |
| id         | int      |
| title      | varchar  |
| created_by | int      |
| created_at | datetime |
| updated_at | datetime |

### list_items

| field        | type     | notes                                       |
| ------------ | -------- | ------------------------------------------- |
| id           | int      |                                             |
| list_id      | int      | cascade delete                              |
| item         | varchar  |                                             |
| completed_at | datetime |                                             |
| due_date     | varchar  | floating `YYYY-MM-DD`                       |
| priority     | varchar  | `high` \| `medium` \| `low` \| `none`       |
| notes        | varchar  |                                             |
| assigned_to  | int      | → family, set null                          |
| created_by   | int      | → family, set null                          |
| image        | varchar  | filename under `static/store/images/lists/` |
| created_at   | datetime | nullable — rows predate the column          |

### list_item_steps

| field        | type     | notes                        |
| ------------ | -------- | ---------------------------- |
| id           | int      |                              |
| item_id      | int      | → list_items, cascade delete |
| step         | varchar  |                              |
| completed_at | datetime |                              |
| sort_order   | int      |                              |

### Favourites

Reuses the shared `user_pins` table (as Notes does) with `rel_type = 'list'`,
`user_id` = the family member id.

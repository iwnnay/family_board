# Locations
-[ ] See if we can integrate Google Maps to pick a locations lat+long and store that for more accurate directions. If it's even needed.

# Calendar

## Done
- [x] Recurring events (weekly / biweekly / monthly / yearly) — materialised, +2yr horizon, self-healing.
- [x] All-day events (floating dates).
- [x] Read-only `GET /api/calendar` feed + `/api/calendar/heal` cron endpoint (token-required).
- [x] Hub dashboard consumes the feed.

## Deployment / wiring (do before relying on it)
- [ ] Set `CALENDAR_API_TOKEN` on family_board and the matching `FAMILY_BOARD_TOKEN` (+ `FAMILY_BOARD_URL`) on the hub.
- [ ] Wire a **monthly** host cron to hit `POST /api/calendar/heal` so series keep rolling forward.
- [ ] MySQL/prod: `yarn db:push` to add the new `calendar_entries` columns (SQLite dev auto-backfills).

## Possible follow-ups
- [ ] Add a unique index on `calendar_entries(series_id, start_time)` to harden the heal/materialise paths against duplicate occurrences under concurrent writes (on-write heal racing the cron).
- [ ] Consider whether "edit this & following" needs a "jump to series start" affordance for whole-series edits (decided unnecessary for now).

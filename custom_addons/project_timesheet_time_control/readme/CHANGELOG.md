# Project Timesheet Time Control — Toggl-Style Enhancements

## Overview

This document describes the Toggl-inspired features added to the `project_timesheet_time_control` module (version bumped to **18.0.3.0.0**). These enhancements transform the existing timesheet timer into a more powerful, user-friendly time tracking experience similar to Toggl Track.

---

## Features Implemented

### 1. Timer Header Bar (Toggl-style)

A persistent timer bar is now displayed at the top of the **Timesheet Dashboard**. It includes:

- **Large Start/Stop button** — visually prominent, green play / red stop
- **Live elapsed timer** — ticking `H:MM:SS` display updated every second
- **Inline project & task selectors** — dropdown menus with search
- Automatic stop of any running timer when starting a new one

**Files involved:**
- `static/src/components/timer_header/timer_header.js` — OWL component logic
- `static/src/components/timer_header/timer_header.xml` — Template
- `static/src/components/timer_header/timer_header.scss` — Styles
- `static/src/dashboard/timesheet_dashboard.js` — Imports and registers the component
- `static/src/dashboard/timesheet_dashboard.xml` — Renders `<TimesheetTimerHeader/>` at the top

**Backend RPC methods added to `account.analytic.line`:**
- `get_running_timer()` — Returns the current user's running timer info
- `start_timer(description, project_id, task_id, tag_ids)` — Stops any running timer and starts a new one
- `stop_running_timer()` — Stops the running timer and returns the duration
- `get_timer_projects()` — Returns projects available for the timer
- `get_timer_tasks(project_id)` — Returns tasks for a specific project
- `get_timer_tags()` — Returns all available tags

---

### 2. Quick Description Input

The timer bar includes an inline text input with the placeholder **"What are you working on?"** that allows users to type a description without opening any form or dialog. Pressing `Enter` starts the timer if a project is selected.

**Location:** Integrated into `timer_header.js` / `timer_header.xml`

---

### 3. Favorites

Users can save frequently used project + task + description + tags combinations as **favorites** and reuse them with a single click.

**New model:** `hr.timesheet.favorite`

| Field | Type | Description |
|-------|------|-------------|
| `name` | Char | Description text |
| `user_id` | Many2one → res.users | Owner (auto-set to current user) |
| `project_id` | Many2one → project.project | Required project |
| `task_id` | Many2one → project.task | Optional task |
| `tag_ids` | Many2many → hr.timesheet.tag | Associated tags |
| `use_count` | Integer | Auto-incrementing usage counter |

**RPC methods:**
- `get_my_favorites()` — Returns the user's favorites formatted for JS
- `add_favorite(name, project_id, task_id, tag_ids)` — Creates or increments a favorite
- `increment_use()` — Bumps the use counter

**UI:**
- ⭐ button opens favorites dropdown in the timer bar
- Click a favorite to populate project/task/description/tags
- ☆+ button saves the current timer config as a new favorite
- 🗑️ button to remove favorites

**Files:**
- `models/hr_timesheet_favorite.py`
- Timer header component (integrated)

**Menu:** *Timesheets > My Favorites*

---

### 4. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + T` | Toggle timer start/stop from anywhere in the timesheet views |

**Location:** Global `keydown` listener in `timer_header.js`, shown as a hint below the timer bar.

---

### 5. Idle Detection

When the timer is running and no user activity (mouse, keyboard, click, scroll) is detected for **10 minutes**, an idle dialog appears with three options:

| Button | Action |
|--------|--------|
| **Keep time & continue** | Dismisses the dialog, keeps all time |
| **Discard idle time** | Stops the timer at the moment of last activity |
| **Stop timer** | Stops the timer with all time (including idle) |

**Location:** `timer_header.js` — idle check runs every 30 seconds when timer is active.

---

### 8. Tags

A new tagging system for timesheet entries.

**New model:** `hr.timesheet.tag`

| Field | Type | Description |
|-------|------|-------------|
| `name` | Char | Tag name (unique, translatable) |
| `color` | Integer | Color index for visual display |
| `active` | Boolean | Archive support |

**New field on `account.analytic.line`:**
- `tag_ids` — Many2many to `hr.timesheet.tag`

**UI additions:**
- Tags column in timesheet **list view** (optional, shown by default)
- Tags field in timesheet **form view**
- Tags widget in the **timer header bar** (dropdown with search + create inline)
- Tags in the **calendar view** popup
- Tags in the **wizard** (hr.timesheet.switch) form
- **Search filter** for tags in the timesheet search view

**Tag creation:** Type a new name in the tag search box and press Enter to create it on the fly.

**Files:**
- `models/hr_timesheet_tag.py`
- `views/account_analytic_line_view.xml` — Tag views, actions, search filter
- `views/timesheet_report_menu.xml` — Configuration > Tags menu
- `wizards/hr_timesheet_switch.py` — tag_ids field
- `wizards/hr_timesheet_switch_view.xml` — tag_ids widget

**Menu:** *Timesheets > Configuration > Tags* (managers only)

---

### 10. Browser Tab Timer

While a timer is running, the browser tab title dynamically updates to:

```
⏱ 1:23:45 - Task Description
```

This allows users to see the running timer without switching to the Odoo tab. The original title is restored when the timer stops.

**Location:** `_updateElapsed()` method in `timer_header.js`

---

### 13. Calendar View

A new **weekly calendar view** for timesheet entries, displaying time entries as colored blocks by project.

**View definition:** `view_calendar_account_analytic_line` in `account_analytic_line_view.xml`

| Property | Value |
|----------|-------|
| Date start | `date_time` |
| Date stop | `date_time_end` |
| Color grouping | `project_id` |
| Default mode | Week |
| Quick create | Disabled |
| Popup fields | name, project, task, duration, employee, tags |

**Calendar also added to the main timesheet action** (`hr_timesheet.act_hr_timesheet_line`) view modes: `list,kanban,pivot,graph,form,calendar`

**Dedicated calendar action** with its own menu entry for direct access.

**Menu:** *Timesheets > Calendar*

---

## Security & Access Rights

New entries in `security/ir.model.access.csv`:

| ID | Model | Group | Read | Write | Create | Delete |
|----|-------|-------|------|-------|--------|--------|
| `access_hr_timesheet_tag_user` | hr.timesheet.tag | Timesheet User | ✅ | ✅ | ✅ | ❌ |
| `access_hr_timesheet_tag_manager` | hr.timesheet.tag | Timesheet Manager | ✅ | ✅ | ✅ | ✅ |
| `access_hr_timesheet_favorite_user` | hr.timesheet.favorite | Timesheet User | ✅ | ✅ | ✅ | ✅ |

---

## New Menu Structure

```
Timesheets
├── Dashboard          (with Timer Header bar at top)
├── My Timesheets
├── All Timesheets     (now includes Calendar in view modes)
├── Calendar           (dedicated calendar view)
├── My Favorites       (favorite timer presets)
├── Start Work         (existing wizard)
├── Timesheet Analysis
└── Configuration
    └── Tags           (managers only)
```

---

## Files Changed Summary

### New files:
| File | Description |
|------|-------------|
| `models/hr_timesheet_tag.py` | Tag model |
| `models/hr_timesheet_favorite.py` | Favorite model |
| `static/src/components/timer_header/timer_header.js` | Timer header OWL component |
| `static/src/components/timer_header/timer_header.xml` | Timer header template |
| `static/src/components/timer_header/timer_header.scss` | Timer header styles |

### Modified files:
| File | Changes |
|------|---------|
| `__manifest__.py` | Version bump to 18.0.3.0.0 |
| `models/__init__.py` | Import new models |
| `models/account_analytic_line.py` | `tag_ids` field, 6 new RPC methods |
| `wizards/hr_timesheet_switch.py` | `tag_ids` field, tags in prepare methods |
| `wizards/hr_timesheet_switch_view.xml` | Tag selector in wizard form |
| `security/ir.model.access.csv` | Access rights for Tag and Favorite models |
| `views/account_analytic_line_view.xml` | Tags in views, Calendar view, Tag/Favorite actions, search filter, calendar mode |
| `views/timesheet_report_menu.xml` | Calendar menu, Tags menu, Favorites menu |
| `static/src/dashboard/timesheet_dashboard.js` | Import TimesheetTimerHeader |
| `static/src/dashboard/timesheet_dashboard.xml` | Render timer header |

---

## Installation / Update

```bash
# Update the module
./odoo-bin -u project_timesheet_time_control -d <database>
```

Or from the Odoo UI: *Apps > Project Timesheet Time Control > Upgrade*

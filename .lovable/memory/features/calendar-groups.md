---
name: Calendar Groups
description: Users can create multiple calendar groups (e.g. family, extended family), add members, and scope events to groups
type: feature
---
- Tables: `calendar_groups` (name, created_by) and `calendar_group_members` (group_id, user_id, role)
- Events have `calendar_group_id` column linking to active group
- Group management in hamburger menu: create, rename, delete, add/remove members
- Active group switcher shown at top of hamburger menu
- Events are filtered by active group in queries
- Event creation defaults to active group, with picker to change
- Any user can create groups; group creator is admin
- Active group persisted in localStorage

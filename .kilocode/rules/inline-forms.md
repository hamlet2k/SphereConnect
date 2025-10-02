# inline-forms.md

Rule description:  
All admin dashboard forms (create/edit/join/etc.) must be displayed inline above their related tables, never in modals. This ensures consistent UX across Guilds, Users, Ranks, Objectives, Categories, and Invites.

## Guidelines

- Inline forms must appear directly above the table in the same page context.
- When a form is opened, the related table must shift down without navigation.
- After successful submission, the form disappears and the table refreshes.
- Cancel buttons close the form without side effects.
- Use `adminPageStyles` for styling consistency.

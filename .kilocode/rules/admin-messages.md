# admin-messages.md

Centralize success, error, and info messages in the admin dashboard using a shared component and hook, instead of custom logic in each manager.
All API responses and admin dashboard messages must follow a unified style for success and error handling. Messages must be short, clear, consistent, and user-friendly.

## Guidelines

- Use the `AdminMessage` component for all message rendering in admin pages  
- Use the `useAdminMessage` hook to set/clear messages  
- Style messages consistently via `getMessageStyleByType` from `AdminPageStyles`  
- Success messages auto-dismiss after 5 seconds  
- Error messages persist until dismissed manually  
- Info messages follow the same unified styling and behavior  
- **Error messages**: `"Unable to <action> <entity>"`  
  Examples: `"Unable to update user guild attributes"`, `"Unable to delete rank"`.
- **Success messages**: `"<Entity> <action> successfully"`  
  Examples: `"User updated successfully"`, `"Rank deleted successfully"`.
- Never expose technical exception details to the UI; log them server-side instead.
- Always use active voice and present/past tense for clarity.


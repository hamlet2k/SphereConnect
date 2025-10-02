# admin-toast-messages.md

Centralize success, error, and info messages in the admin dashboard using a shared component and hook, instead of custom logic in each manager.

## Guidelines

- Use the `AdminMessage` component for all message rendering in admin pages  
- Use the `useAdminMessage` hook to set/clear messages  
- Style messages consistently via `getMessageStyleByType` from `AdminPageStyles`  
- Success messages auto-dismiss after 5 seconds  
- Error messages persist until dismissed manually  
- Info messages follow the same unified styling and behavior  

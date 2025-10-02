# admin-confirmation-modals.md

Replace all `window.confirm` and `window.alert` calls in the admin dashboard with a shared confirmation modal.

## Guidelines

- Use the `ConfirmModal` component for all destructive-action prompts (delete, revoke, remove, etc.)  
- Use the `useConfirmModal` hook to stage and execute confirm callbacks  
- Always include descriptive text in the modal (action, entity type, and entity name)  
- Follow the shared admin styles for modal appearance and buttons  
- Never rely on browser-native alerts or confirms inside admin components  

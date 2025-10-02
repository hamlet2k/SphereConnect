# confirmation-modals.md

Rule description:  
All destructive actions (delete, revoke, reset, etc.) must use the shared `ConfirmModal` component for confirmation, replacing all `window.confirm` or `window.alert` calls.

## Guidelines

- `ConfirmModal` must be styled with `AdminPageStyles`.
- Always require explicit confirmation before destructive actions.
- Support cancel/close buttons that cleanly dismiss the modal.
- Use clear confirmation text: `"Are you sure you want to delete this <entity>?"`
- Never bypass confirmation for destructive actions, even in batch operations.

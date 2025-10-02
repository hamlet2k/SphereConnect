# Strict HTTP Method Usage

API endpoints must use correct HTTP methods and return codes.

## Guidelines

- Use `PATCH` for partial updates.
- Use `PUT` for full replacements.
- `DELETE` must return a JSON response with a confirmation message.
- Use `409 Conflict` for business rule violations (e.g., rank in use).
- Avoid using generic `400` where a more specific code applies.

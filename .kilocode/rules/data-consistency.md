# Data Model Consistency

Ensure consistent use of IDs and fields across backend and frontend.

## Guidelines

- Objectives must use `allowed_ranks[]`, not the deprecated `applicable_rank`.
- Categories must be referenced by ID, not by name.
- Ensure endpoints return normalized data for consistency across clients.

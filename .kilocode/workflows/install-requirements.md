# Install Project Requirements

Sets up all required dependencies for the project environment.

## Steps

1. Ensure Python and Node.js versions match the project’s `.tool-versions`.
2. Run `pip install -r requirements.txt` (backend).
3. Run `pip install -r requirements-dev.txt` (backend).
4. Run `npm install` or `yarn install` (frontend).
5. Verify installation with `pytest --version` and `npm run build`.

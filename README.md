# EcoMap Community

Full-stack TypeScript application with Express.js backend and React frontend.

## Project Structure

This is a **monorepo** using npm workspaces:
- `backend/` - Express.js API server (TypeScript)
- `frontend/` - React application (TypeScript + Vite)

## Why Multiple node_modules?

This project uses **npm workspaces** which:
- Hoists most dependencies to the root `node_modules/` (efficient, saves space)
- Keeps workspace-specific packages in `backend/node_modules/` and `frontend/node_modules/` only when needed
- This is the standard and efficient way to manage dependencies in monorepos

**Total size**: ~160MB (mostly in root, very little duplication)

## Setup (All commands run from root directory)

```bash
# Install all dependencies for all workspaces
npm install
# or
npm run install:all

# Run both backend and frontend together
npm run dev

# Or run individually from root
npm run backend   # Backend only (TypeScript with hot reload)
npm run frontend   # Frontend only (Vite dev server)
```

## Development

- **Backend**: Runs on `http://localhost:3001`
- **Frontend**: Runs on `http://localhost:5173` (or similar)
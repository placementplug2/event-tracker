# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

Smart College Event Tracker is a Node.js + Express backend for an academic event tracking system backed by MongoDB. It supports:
- Student-specific academic events (by department, semester, and registrations).
- QR-based attendance for internal marks, NSS/club hours, and participation certificates.
- An admin-facing experience for managing events, circulars, deadlines, and notifications.
- Participation analytics and annual reporting (to be implemented on top of this backend).

## Architecture and structure

### Runtime stack and entrypoints
- **Express API** – `src/index.js` is the main entry point. It:
  - Loads environment variables via `dotenv`.
  - Creates an Express app, enables CORS, and configures JSON body parsing.
  - Exposes a root `GET /` endpoint that returns `{ message: 'Smart College Event Tracker API is running' }` as a health check.
  - Calls `connectDb()` from `src/db.js`; the HTTP server only starts listening after a successful MongoDB connection.

- **MongoDB via Mongoose** – `src/db.js` encapsulates connection logic. It:
  - Reads `MONGO_URI` from the environment, defaulting to `mongodb://localhost:27017/smart_college_events`.
  - Connects using Mongoose with `useNewUrlParser` and `useUnifiedTopology` options.
  - Logs connection success and surfaces connection errors back to the caller.

At present there are no dedicated domain modules (models, controllers, or routers) beyond the root health-check endpoint; all routing happens in `src/index.js` and there are no schema definitions yet. Future work will typically involve introducing Mongoose models and route modules under `src/` and wiring them into the Express app in `src/index.js`.

## Configuration and environment
- **Environment variables** (loaded via `dotenv`):
  - `PORT` (optional): HTTP port for the Express server. Defaults to `3000`.
  - `MONGO_URI` (optional): MongoDB connection string. Defaults to `mongodb://localhost:27017/smart_college_events`.
- A local `.env` file is commonly used for development, but any mechanism that sets these variables will work.
- A running MongoDB instance reachable at `MONGO_URI` is required before the server can start.

## Commands and workflows

> This repository currently does **not** include a `package.json` or npm/yarn scripts. The commands below assume a standard Node.js environment with dependencies installed globally in this clone.

### Install runtime dependencies

From the repository root, install the libraries used by the code:

```bash path=null start=null
npm install express cors dotenv mongoose
```

(If you later add a `package.json`, move these into `dependencies` there and prefer `npm install` without explicit package names.)

### Run the API server (development)

From the repository root:

```bash path=null start=null
node src/index.js
```

This will:
- Load environment variables via `dotenv`.
- Connect to MongoDB using `MONGO_URI` or the local default.
- Start the Express server on `PORT` (default `3000`).

To verify it is running, call:
- `GET http://localhost:3000/` → returns the JSON health-check message.

### Linting and tests

There are currently **no linting or test tools configured** in this repo (no `package.json`, no test runner). As a result, there are no project-specific commands for running a full test suite or a single test.

When you introduce a Node.js project configuration (e.g., ESLint and Jest/Mocha), prefer to expose common operations via npm scripts such as:
- `npm run lint`
- `npm test` (with support for filtering/running a single test via the chosen test runner)

and update this `WARP.md` with the concrete commands once they exist.

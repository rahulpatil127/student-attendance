# Deployment Guide

## Local development
- Backend: create a virtual environment, install `backend/requirements.txt`, copy `.env.example` to `.env`, run migrations, create a superuser, then run Django.
- Frontend: install dependencies, copy `.env.example` to `.env`, then run the Vite development server.
- Configure the frontend API base URL and Django CSRF trusted origins for local development. Prefer a same-origin proxy in production.

## Production checklist
- Set `DEBUG=False`; configure `SECRET_KEY` and database path via environment.
- Set exact `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`.
- Serve over HTTPS; enable secure session cookies and appropriate security headers.
- Configure static file serving and persistent storage for SQLite database.
- Ensure only one appropriate application deployment writes to the SQLite database; account for file locking and write concurrency.
- Back up database consistently, encrypt backups, restrict access, define retention, and test restore.
- Run migrations as a controlled release step; collect static assets.
- Create admin credentials through a secure one-time process; force password change if applicable.
- Configure logs and health checks; do not log credentials, cookies, tokens, or sensitive student details.
- Establish data retention, account deactivation, incident response, and access review procedures.

## Scale limitation
SQLite is retained because it is an explicit requirement. If concurrent writes, availability, or institutional scale exceed SQLite's operational limits, plan a reviewed migration to PostgreSQL rather than attempting ad hoc file-sharing or unsafe database copying.

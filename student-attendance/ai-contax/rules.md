# Agent Rules — Student Attendance System

## Mandatory engineering rules
1. Read `ai-contax/architecture.md`, `ai-contax/context.md`, and `ai-contax/software-development-plan.md` before changing code.
2. Implement the agreed stack only: React.js + Vite + JavaScript, Tailwind CSS, Django, Django REST Framework, SQLite, and Django session authentication.
3. Do not introduce JWT, a second database, a UI framework, or a new architectural pattern without documenting the reason and updating the architecture first.
4. Never invent requirements, endpoints, fields, user roles, or business rules. If a decision blocks implementation, record a concise assumption in `docs/decisions.md` and choose the safest reversible default.
5. Enforce all authorization on the backend. Hiding a button or route is not security.
6. Use Django's password hashing and authentication. Never store plaintext passwords or create custom cryptography. If bcrypt is required, use Django's supported hasher configuration.
7. Keep secrets out of source control. Provide `.env.example` with placeholders only.
8. Use migrations for schema changes. Never edit an already-applied migration to change deployed schema.
9. Add validation, permission tests, and regression tests with each feature.
10. Use atomic transactions for multi-record attendance operations and database constraints for uniqueness/integrity.
11. Use timezone-aware datetimes and the configured institution timezone.
12. Use typed React components, reusable UI primitives, and clear feature boundaries. Avoid giant components and duplicated business logic.
13. Include loading, empty, error, success, and unauthorized states in every data-driven screen.
14. Ensure keyboard accessibility, semantic labels, visible focus, responsive layouts, and reduced-motion support.
15. Never expose private student records across role boundaries. Minimize data returned by serializers.
16. Do not silently delete historical attendance. Prefer archival or audited correction.
17. Keep API documentation and README synchronized with actual implementation.
18. Do not claim a feature is complete unless its tests pass and acceptance criteria are met.
19. Run backend tests, frontend lint/type checks/tests, and production builds before marking a milestone done.
20. Report commands run, results, known limitations, and next steps in each handoff.

## Code conventions
- Python: PEP 8, type hints where practical, Ruff formatting/linting.
- Django: thin views, serializers for validation, services for domain workflows, explicit permissions.
- React: functional components, hooks, plain JavaScript, feature-oriented folders.
- Naming: descriptive, consistent, no unexplained abbreviations.
- Errors: user-safe messages in UI; detailed diagnostic logs without secrets on server.
- Commits: small, focused, imperative messages.

## Definition of done
A feature is done only when:
- Acceptance criteria are implemented.
- Backend authorization and validation are tested.
- UI handles loading/empty/error/success states.
- Responsive and keyboard behavior is checked.
- Documentation is updated.
- Relevant tests and build checks pass.

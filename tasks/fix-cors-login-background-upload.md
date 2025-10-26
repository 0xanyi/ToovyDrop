# Task: Fix CORS for Login Background Upload

## Goal
Restore the ability for admins to update the login background image from new branded frontend domains by ensuring the backend always emits the correct `Access-Control-Allow-Origin` header for authenticated requests to `/api/settings/login-background` (and the rest of the API).

## Implementation Plan
1. **Review current CORS origin normalization**
   - Inspect `parseAllowedOrigins` / `app.ts` to confirm how the allowed origin list is assembled today.
   - Identify the environment variables already present (`CORS_ALLOWED_ORIGINS`, `CORS_ORIGIN`, `FRONTEND_URL`, etc.) so we can safely combine them.

2. **Enhance origin parsing utility**
   - Extend `parseAllowedOrigins` to accept multiple raw values (string or string array) and handle deduplication while preserving insertion order.
   - Reuse the existing normalization (lowercasing, trailing slash removal, wildcard support) for each supplied value.

3. **Augment backend bootstrap configuration**
   - Update `backend/src/app.ts` to build the allowed origin set from all relevant env vars (`CORS_ALLOWED_ORIGINS`, legacy `CORS_ORIGIN`, new `CORS_ADDITIONAL_ALLOWED_ORIGINS`, and `FRONTEND_URL`/`FRONTEND_URLS`).
   - Ensure the resulting list feeds both the CORS middleware and CSP `connect-src` directives so WebSocket upgrades inherit the broader allow-list.

4. **Update configuration docs & samples**
   - Reflect the new optional env (`CORS_ADDITIONAL_ALLOWED_ORIGINS`) in `backend/.env.example` and mention the automatic inclusion of `FRONTEND_URL` in deployment docs.

5. **Add/adjust automated coverage**
   - Expand `backend/tests/utils/cors.test.ts` to cover the new multi-value parsing behaviour and confirm that the merged origins include the frontend URL.
   - If necessary, tweak existing assertions affected by ordering or the supplemented origins.

## Testing Strategy
- `npm run lint` (backend)
- `npm test` (backend)
- `getIdeDiagnostics` for the modified TypeScript files

## Deployment / Rollout Notes
- Deployment teams should populate `CORS_ADDITIONAL_ALLOWED_ORIGINS` when extra branded domains are required; otherwise setting `FRONTEND_URL` remains sufficient.
- No database migrations or cache invalidations are required.

## Progress Log
- [x] Drafted implementation plan
- [x] Updated CORS utilities and backend bootstrap configuration
- [x] Documented new configuration options
- [x] Extended unit coverage for origin parsing
- [ ] Awaiting automated verification (lint/tests)

# POS deployment

Target: `https://pos.beinterior.com.bd`. Use private application root `/home/robilea1/bei-pos-app`, Node 24, Production mode and startup file `app.cjs`. The domain's document root is separate from private source/config/backups. Existing `web.beinterior.com.bd` must remain untouched.

The production React build uses same-origin `/api`; local development retains localhost:5000. `VITE_API_URL` can explicitly override the base URL at build time. The server serves only `public/` plus SPA HTML navigation, never private files or unknown API routes.

Upload source/package files, Prisma migrations, fonts and the built frontend as `public/`. Exclude all local `.env`, backups, keys, test data dumps, old source copies, node_modules and reset tooling. Install dependencies in the cPanel Node environment and run Prisma generate there, never upload Windows node_modules.

Use a new dedicated empty MySQL database and a least-privilege database user. The owner enters new credentials directly in cPanel/private configuration. Set private `DATABASE_URL`, a production `JWT_SECRET`, `NODE_ENV=production` and private backup paths. Never put secrets or SQL in the public domain directory.

For a fresh database, apply migrations with `npx prisma migrate deploy`; provision the existing authorized Admin from a private clean database export, or an owner-controlled setup. Do not reset/import over another site's database. Verify `/api/health`, login, empty balances and protected routes before declaring deployment complete.

`app.cjs` returns a generic 503 until database and JWT settings exist. This is an installation state, not a working deployment. Google Drive/cron configuration follows AUTOMATIC-BACKUPS.md after deployment.

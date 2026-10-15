# Editable page access

Admin → User Access → Edit page permissions supports view and create/edit access for an entire non-Admin role or an individual user. Defaults are unchanged until saved. A user policy replaces the role policy; reset deletes that override and restores inheritance. Role reset returns to the built-in defaults.

Admin access cannot be restricted. User management, audit history and backups remain Admin-only. Existing approval/financial-action restrictions and assigned-project scoping remain enforced separately; page edit access does not grant Admin approval powers. Selected pages may use minimal project/category/vendor lookups without exposing those full pages. Removing every page revokes business-page access, while auth/me and logout remain usable.

Apply Prisma migration 20261015100000_editable_page_permissions and regenerate the client BEFORE deploying server code. Policies are stored in page_permissions and included in future database backups. Old backups from before this table require the operator's cross-version restore review. No existing role policy is seeded/modified during migration.

Every authenticated non-Admin request resolves effective access from the database (no stale token permissions). UI menus update on session refresh; reload/re-login to see a changed menu immediately. Policy saves recheck active Admin status transactionally, serialize with user-role updates, and require the current policy version to prevent stale saves. The audit middleware records the subject and saved page sets without passwords.

This change implements page permissions. Password reset, self-service password changes and mandatory first-login password changes discussed previously are a separate pending implementation, not claimed as completed here.

Verification: backend tests cover unchanged defaults, role/user precedence, view/write denial, protected Admin actions, no-page access, non-Admin API denials, stale versions and reset. UI test covers editing and inheritance. Run the existing role/sidebar matrix, lint and production build before deployment. Live policies must be selected by the owner; this feature does not automatically broaden any real user's access.

Local verification 2026-10-15: additive migration applied; real database integration used generated Admin/Storekeeper accounts and confirmed grants/revocation with the same JWT plus reset to defaults. Test users, custom policies and audit events were removed. Backend tests passed, 14 UI tests passed, affected-file lint passed and production build passed (existing large-bundle advisory remains). No live role/user policy has been changed. Password management remains pending.

Live deployment 2026-10-15: source rollback archive and verified cloud database backup created before update. Release uploaded to the private app root; migration applied and Prisma client regenerated, then Passenger restart requested. Existing Admin session successfully loaded the live permission editor and inherited role matrix. No real user/role policies were saved. The scheduled 03:00 backup was also observed VERIFIED. A post-migration cloud backup was initiated.

# Encrypted automatic backups

The existing work was committed as `3eb0eb2` before adding this feature. No database schema migration or new package is required.

## What is included

- Admin-only **Backups** page, manual run, recent history, cloud status and last successful run. Dashboard warns about failed backups or no success within 36 hours. These are in-app alerts; no email/WhatsApp destination is configured.
- Database dump streamed through gzip and AES-256-GCM encryption. No plaintext SQL is written during backup. Every completed local backup is decrypted/authenticated and decompressed to a discard stream before success is recorded.
- Rclone upload to Google Drive or another named rclone destination; downloaded encrypted bytes are compared before cloud verification is marked complete. No cloud access tokens or recovery keys are exposed to the web client.
- Retention keeps the newest backup for each of the latest seven distinct Dhaka dates, plus one representative for each of the latest four calendar weeks with backups (Monday boundaries). Overlapping representatives are kept once. Files belonging to other installations and unrelated names are never selected. Upload/verification failures skip pruning.
- Exclusive filesystem lock prevents concurrent CLI/manual runs. A crashed process leaves the lock for operator review, rather than automatically risking two simultaneous backups.
- Scheduling uses hosting Cron Jobs. The application does not pretend that enabling a setting installs a cron job.

## Hosting setup (owner/operator)

Keep the server application, private backup folder, key, rclone configuration and `.env` **outside `public_html`**. Only the frontend build belongs in a public folder. Restrict private files to the hosting user, and keep a separate protected copy of the encryption key off this server. Losing the key makes encrypted backups unrecoverable. The SQL includes credentials hashes and all database-stored documents/photos; application code and environment configuration require separate recovery copies.

Install the hosting-supported Node runtime, mysqldump/MariaDB dump utility and rclone. This feature does not install binaries or connect an external account automatically. Confirm cPanel permits running them and Cron Jobs; some shared plans do not.

Configure these variables in the server's private environment:

```text
BACKUP_PRIVATE_DIR=/home/CPANEL_USER/bei-private/backups
BACKUP_KEY_FILE=/home/CPANEL_USER/bei-private/backup-encryption.key
MYSQLDUMP_BIN=/usr/bin/mysqldump
RCLONE_BIN=/home/CPANEL_USER/bin/rclone
RCLONE_CONFIG=/home/CPANEL_USER/bei-private/rclone.conf
BACKUP_REMOTE=gdrive:BEI-Finance-Backups
BACKUP_AUTO_ENABLED=true
```

Replace example paths with verified hosting paths. `DATABASE_URL` is read from the normal server environment; do not place database passwords in cron arguments. Child dump credentials are passed in a process environment, not the command line. Start from the server folder:

```text
node automatic-backup.js --init-key
node automatic-backup.js --run
```

Key creation refuses to overwrite an existing key. Do not rotate/replace a key without preserving the keys needed for older backups. The default local private folder is `server/backup-private/`, ignored by Git. Local setup has been initialized; deployment needs private configuration on its own host.

### Google Drive / other storage

The owner connects the intended account through `rclone config --config /private/path/rclone.conf`. Do this interactively; never paste a password/token into this chat or the application. For Google Drive, review rclone's scope choices and use a dedicated backup destination. After connection, set `BACKUP_REMOTE` to that named remote/folder, then run a manual backup and confirm `VERIFIED` in the Admin history.

Each installation has a random private `installation-id`; remote files live under `<remote-folder>/bei-<installation-id>/`. Retention uses single-file deletion only on strictly matching backup filenames inside that folder, after the new cloud copy passes verification. It never uses `sync`, `purge` or recursive cloud deletion. Keep the installation ID stable when moving the same deployment.

Official references: [Drive configuration/scopes](https://rclone.org/drive/), [copyto](https://rclone.org/commands/rclone_copyto/), [download verification](https://rclone.org/commands/rclone_check/), [single-file deletion](https://rclone.org/commands/rclone_deletefile/).

### Daily schedule

Install a daily cPanel Cron Job using the actual absolute Node path and server folder:

```sh
cd /home/CPANEL_USER/bei-finance/server && /absolute/path/to/node automatic-backup.js --scheduled >> /home/CPANEL_USER/bei-private/backup-cron.log 2>&1
```

Choose the cron time only after checking the hosting timezone. For example, **21:00 UTC is 03:00 Asia/Dhaka the following day**. Cron logs contain only generic success/failure messages; failure exits nonzero. `BACKUP_AUTO_ENABLED=false` or unset makes scheduled runs exit without taking a backup. Setting it true alone does not install the job. Confirm the first scheduled run in Backups history (`scheduled: true` in the private status log).

## Recovery and failure handling

Download the encrypted file privately and verify its recorded SHA-256. With the correct private key configured:

```text
node automatic-backup.js --decrypt /private/backup.sql.gz.enc /private/new-recovery.sql
```

The output path must not already exist. Wrong keys/tampered files fail authentication; failed partial SQL is removed. This command never imports SQL into a database. Restore into an isolated reviewed database first, compare full schema/row hashes, then plan any production recovery separately. Run a restore drill after setup and periodically thereafter (for example monthly); the cron backup performs encryption integrity checks, not an automatic database restore.

On cloud failure, the encrypted local file and previous successful backups are retained. Fix the connection, then run a fresh backup. Do not treat local-only success as off-device protection. Status history is an attempt history: older listed files may have been removed by retention. No automatic retry loop hides a failed cron run.

If a worker crashes, verify no backup process is active before removing its private `running.lock`; then rerun. Never remove a lock merely because another run takes longer than expected. Utilities time out after twenty minutes; unusually large databases may require an operator-reviewed timeout adjustment.

## Verification on 2026-10-14

- Four backend tests cover encryption/Bengali/binary round-trip, wrong keys/tampering, retention ownership, cloud command sequence and failure preservation, lock protection, scheduled disable behavior, and all non-Admin API denials.
- Thirteen frontend tests pass, including the seven-role sidebar matrix with Backups visible only to Admin, plus failure/setup UI.
- First real encrypted local backup successfully restored into a generated isolated database: **54 table schema/data hashes matched; source unchanged**. The temporary restore database and decrypted SQL were removed.
- Browser Admin page shows SUCCESS, local backup history, Cloud Not connected and Automatic Not enabled. Manual backup requested in the browser and completion checked separately.
- Google Drive upload uses a mocked command adapter in tests. **Real cloud upload and the hosting cron job are not enabled or verified** until the owner connects the destination and hosting is configured.

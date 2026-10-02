# Project workflow

- Before starting a new phase or unrelated change, inspect Git status and commit the completed prior work as a checkpoint.
- Preserve existing uncommitted work. If work is already mixed when starting, explain what the checkpoint includes rather than claiming separate historical commits.
- Stage explicit source, migration, test and documentation paths. Do not include environment files, credentials, database dumps or local backup copies in ordinary feature commits.
- Complete appropriate verification, then commit the finished change. Never force-push or discard local work to synchronize Git.

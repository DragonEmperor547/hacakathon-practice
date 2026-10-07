# 📝 Collaborator Audit Logs Directory

This directory stores individual audit logs for each collaborator and feature branch.

## Why Separate Audit Files?
In a fast-paced hackathon, having multiple team members edit the same file (`AUDIT_LOG.md`) simultaneously leads to Git merge conflicts. To guarantee **0 merge conflicts**, each collaborator writes their own log in this folder:

- `audit_logs/AUDIT_LOG_<YOURNAME>_NOTIFICATIONS.md`
- `audit_logs/AUDIT_LOG_<YOURNAME>_ANALYTICS.md`

The Team Lead will merge your branch and optionally consolidate the summaries into the main project changelog.

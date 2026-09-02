# Changelog

Release notes for each version. Translated from the Italian `Changelog.md`.

## v2.6.0

### New

* **Cloud Sync**: optional sync to a personal Supabase project (push ⬆ / pull ⬇ buttons in the home topbar). Data is encrypted client-side with AES-GCM before transmission; Supabase Row Level Security isolates each user to their own partition. One-time setup: create a free Supabase project, run the table creation + RLS policy SQL (documented in the README), then paste URL and anon key in Settings → Data → Cloud Sync. The API key, resolver templates and network sources are **not** synced — they stay on the device and in the local backup only.

### Changes

* **Supabase key format updated**: README documents the new `sb_publishable_...` key format (replacing the legacy `eyJ...` anon key) for projects created after 2025.
* **Cloud config auto-saves**: URL, anon key and sync toggle are persisted immediately on input, no manual toggle required.

# Achievement System

Achievement System is a local-first personal productivity app for todos, check-ins, time records, inspirations, achievement points, and a reward shop. The app stores data locally first and can sync selected records to Supabase for use across devices.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Local browser storage for offline-first state

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set these variables in `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the development server:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Enable email/password authentication in Supabase Auth.
3. Open the Supabase SQL editor.
4. Run the SQL in `supabase-migrations.sql`.
5. Add the project URL and anon key to `.env`.

The migration creates the synced tables, row-level security policies, and helper columns used by the sync model.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run build:zip
```

## Sync Model

The app keeps the primary working state in localStorage under `work-status-app-data`. Supabase sync is manual: upload pushes local dirty records to the cloud, and download merges cloud records back into local state.

Syncable records use both snake_case and camelCase metadata for compatibility:

- `is_dirty` / `isDirty` marks records that need upload.
- `synced_at` / `syncedAt` records the last successful sync time.
- `work-status-app-deleted-ids` stores deletion tombstones so deleted records do not reappear after cloud download.

Record behavior:

- Todos, check-in projects, inspirations, shop items, and time records are upserted.
- Check-in records and achievement logs are append-style records.
- Time records are upserted because their `endTime` and `note` can change after creation.
- Moving an inspiration to a todo deletes the original inspiration and records a deletion tombstone.

## Backup And Import

JSON export is the safest full backup format. Importing JSON replaces the current local app state, so export a fresh backup before importing another file.

Imported JSON is treated as new local data:

- sync timestamps are cleared;
- records are marked dirty;
- imported records can be uploaded to the current Supabase account on the next manual sync;
- todo total time and achievement totals are recalculated from imported records.

CSV import/export is useful for moving simple tabular data, but it is lossy compared with JSON and should not be treated as a full backup.

## Deployment

The app builds to static files in `dist`.

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider.
2. Run `npm run build`.
3. Deploy the generated `dist` directory.

Any static host that supports Vite output can serve the app.

## Troubleshooting

- If sync is disabled, verify that the `.env` values are not placeholders.
- If sync fails with database errors, rerun `supabase-migrations.sql` and confirm the tables and RLS policies exist.
- If a deleted local item appears again after download, check whether a deletion tombstone exists in `work-status-app-deleted-ids`.
- If imported data does not appear in another device, run manual upload from the importing device first, then download on the other device.

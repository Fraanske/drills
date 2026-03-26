# Basketball Drills Workspace

Next.js + Supabase app for managing basketball drills and editable drill diagrams.

## Stack

- Next.js 16
- Tailwind CSS
- Supabase Auth + Postgres
- Vercel deployment from the repo root

## Local files

Environment variables live in `.env.local` and should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

An example file is included in `.env.local.example`.

## Scripts

```powershell
npm install
npm run dev
npm run build
```

## Supabase setup

1. Run the SQL in `supabase/migrations/001_initial_schema.sql`
2. Confirm the tables exist and RLS is enabled
3. Enable `Email` in `Authentication > Sign In / Providers`
4. Add your app URL in `Authentication > URL Configuration`
5. Create users manually in `Authentication > Users`

## Deployment

Deploy this repo from the root in Vercel.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Each push to `main` can trigger a new Vercel deployment.

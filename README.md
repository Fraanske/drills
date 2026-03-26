# Basketball Drills Workspace Scaffold

This is a **Next.js + Supabase scaffold** for a multi-user basketball drills app with an editable online flow board.

It is intentionally scoped to the right first version:

- multi-user workspace model
- drill library and drill detail page
- editable SVG diagram board
- Supabase schema with RLS
- Vercel deployment path

It is **not** a finished production app yet. The wiring points are clear, but you still need to connect auth, database queries, and save/update flows.

---

# What is included

## Frontend
- Next.js App Router scaffold
- Tailwind setup
- Home page
- Sign-in page placeholder
- Drill detail page
- Diagram editor component

## Backend direction
- Supabase schema SQL
- workspace/team model
- RLS starter policies
- API route that validates diagram payloads

## Files to care about first
- `app/page.tsx`
- `app/drills/[id]/page.tsx`
- `components/diagram-editor.tsx`
- `app/api/diagrams/route.ts`
- `supabase/migrations/001_initial_schema.sql`
- `.env.local.example`

---

# Architecture

## Recommended stack
- **Frontend**: Next.js on Vercel
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth
- **File storage**: Supabase Storage
- **Diagram persistence**: store board state as JSON in `diagrams.data_json`

## Why diagrams are stored as JSON
Do not store the flow board as only a PNG.

Store the editable state as JSON so coaches can:
- re-open and edit a drill later
- duplicate drills and adapt the movement
- generate preview images later without losing editability

---

# Step-by-step build guide

This guide assumes you already have:
- a free Vercel account
- a free Supabase account
- Git installed
- Node.js installed

Use **PowerShell** for all local commands below.

---

# Step 1: Create the project locally

## 1.1 Create the Next.js app
Open PowerShell and run:

```powershell
npx create-next-app@latest basketball-drills-workspace --ts --tailwind --eslint --app --src-dir false --use-npm
```

If `--src-dir false` gives you trouble because the CLI version changes, just run the interactive prompts and choose:
- TypeScript: Yes
- Tailwind: Yes
- ESLint: Yes
- App Router: Yes
- src directory: No

## 1.2 Replace the starter files
Copy the scaffold files from this package into your project folder.

At minimum replace:
- `app/`
- `components/`
- `lib/`
- `supabase/`
- `package.json`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`

## 1.3 Install dependencies
In PowerShell:

```powershell
cd .\basketball-drills-workspace
npm install
```

If you prefer pnpm, switch the package manager consistently everywhere.

---

# Step 2: Create the Supabase project

## 2.1 Make a new project
In Supabase:
- click **New project**
- pick your organization
- choose a project name, for example `basketball-drills-workspace`
- set a strong database password
- choose a region close to your users
- create the project

Wait until the project is fully provisioned.

## 2.2 Get your project keys
In Supabase:
- go to **Project Settings**
- open **API**
- copy:
  - `Project URL`
  - `anon public` key

## 2.3 Create your local environment file
Create `.env.local` in the project root.

Copy from `.env.local.example` and fill in your values:

```powershell
Copy-Item .\.env.local.example .\.env.local
```

Then edit `.env.local` to contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

---

# Step 3: Create the database schema in Supabase

## 3.1 Open the SQL Editor
In Supabase:
- go to **SQL Editor**
- create a new query

## 3.2 Run the migration
Open `supabase/migrations/001_initial_schema.sql` from this scaffold.

Paste the contents into the SQL Editor and run it.

That creates:
- `workspaces`
- `workspace_members`
- `drills`
- `tags`
- `drill_tags`
- `diagrams`
- RLS policies

## 3.3 Verify tables
In Supabase:
- go to **Table Editor**
- confirm the tables exist
- confirm RLS is enabled

Do not skip this check. If RLS is off, your app is not properly secured.

---

# Step 4: Set up authentication in Supabase

## 4.1 Choose auth methods
For the first version, use one of these:
- Email magic link
- Google sign-in

Email magic link is simplest.

## 4.2 Enable the provider
In Supabase:
- go to **Authentication**
- open **Providers**
- enable **Email** or **Google**

## 4.3 Set the redirect URLs
You need both local and production URLs.

Add these when relevant:
- `http://localhost:3000`
- your future Vercel domain, for example `https://basketball-drills-workspace.vercel.app`

If you add Google auth later, you must also configure the Google OAuth credentials in Google Cloud.

---

# Step 5: Create the first workspace and membership manually

The scaffold does not yet include an onboarding flow. So create the first workspace manually in Supabase.

## 5.1 Create a user
Use your sign-in flow later, or create one by logging into the app after auth is wired.

Once a user exists, note their `auth.users.id`.

## 5.2 Insert a workspace
In Supabase SQL Editor, run:

```sql
insert into public.workspaces (name, slug, created_by)
values ('Main Coaching Staff', 'main-coaching-staff', 'YOUR_USER_ID');
```

## 5.3 Add yourself as admin
Then run:

```sql
insert into public.workspace_members (workspace_id, user_id, role)
select id, 'YOUR_USER_ID', 'admin'
from public.workspaces
where slug = 'main-coaching-staff';
```

Now your account can see and manage that workspace under the current RLS rules.

---

# Step 6: Start the app locally

Run:

```powershell
npm run dev
```

Then open:

```text
http://localhost:3000
```

You should see:
- the home page
- a sample drill link
- a placeholder sign-in page
- the sample diagram board

---

# Step 7: Wire Supabase reads into the app

Right now the scaffold uses sample data. Replace that with real queries.

## 7.1 Start with the home page
Edit `app/page.tsx`.

Replace `starterDrills` with a server-side query that reads drills for the active workspace.

Typical direction:
- get the current session user
- find the active workspace for that user
- query `drills` filtered by that workspace

## 7.2 Wire the drill detail page
Edit `app/drills/[id]/page.tsx`.

Replace the hard-coded drill and diagram with:
- a `drills` query by `id`
- a `diagrams` query by `drill_id`

## 7.3 Use server-side Supabase client
Start from `lib/supabase-server.ts`.

That is the right place for server-side page fetches.

---

# Step 8: Wire auth into the sign-in page

Edit:
- `app/(auth)/sign-in/page.tsx`

For magic links, the basic flow is:
- user enters email
- call Supabase auth sign-in method
- show success state
- user clicks the email link
- session is established

The scaffold leaves this as a placeholder on purpose.

---

# Step 9: Save diagrams into Supabase

The diagram board already creates a valid JSON payload.

## 9.1 What the editor currently does
`components/diagram-editor.tsx` currently:
- keeps board objects in client state
- posts them to `/api/diagrams`

`app/api/diagrams/route.ts` currently:
- validates the payload with Zod
- returns success
- does not yet update a row

## 9.2 What to change
You need to pass:
- `diagram_id`
- `drill_id`
- possibly `workspace_id`

Then update the correct row in `public.diagrams`.

## 9.3 Suggested next API payload
Change the payload shape to include:

```json
{
  "diagramId": "uuid",
  "drillId": "uuid",
  "courtType": "full_court",
  "objects": []
}
```

Then in the route:
- verify the user session
- verify the user can edit the workspace
- update `data_json`
- update `updated_at`

---

# Step 10: Add drill editing

You need a real drill form next.

## Suggested order
1. Add a server component page for drill detail fetch.
2. Add a client drill form component.
3. Save fields back to `public.drills`.
4. Add tag assignment.
5. Add create and delete flows.

## Drill fields to keep in v1
- title
- one_liner
- explanation
- setup
- flow_steps
- coaching_points
- variations
- players_needed
- court_area
- age_group

That is enough for a serious first version.

---

# Step 11: Add multi-user invitations

Do this after single-user-in-workspace works correctly.

## v1 approach
Keep invites simple:
- admin creates a signed invite link or code
- invited coach signs in
- app adds them to `workspace_members`

## Do not build first
- live simultaneous editing on the same diagram
- per-object locking
- multi-cursor presence

That is version 2 or 3 work.

---

# Step 12: Add Vercel deployment

## 12.1 Push to GitHub
In PowerShell:

```powershell
git init
git add .
git commit -m "Initial scaffold"
```

Create a GitHub repo, then connect it:

```powershell
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 12.2 Import into Vercel
In Vercel:
- click **Add New Project**
- import the GitHub repository
- keep the framework as **Next.js**

## 12.3 Add environment variables in Vercel
In the Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the same values as local.

## 12.4 Deploy
Click deploy.

When deployment finishes, copy the Vercel URL.

---

# Step 13: Update Supabase auth URLs for production

After Vercel gives you the real domain, go back to Supabase.

Add the production URL in the auth redirect settings.

Examples:
- `https://your-project.vercel.app`
- any custom domain later

If you skip this, auth callbacks often fail in production.

---

# Step 14: What to build next

## Highest-value next tasks
1. real Supabase auth wiring
2. real drill CRUD
3. save/load diagrams from database
4. workspace switcher
5. invite flow for coaches

## After that
1. quick-add one-liner parser
2. tag filters
3. diagram thumbnails
4. duplicate drill
5. practice session builder

---

# Suggested implementation order inside the codebase

## First pass
- replace sample data with Supabase reads
- connect sign-in
- create one real workspace
- save one real diagram

## Second pass
- add drill create form
- add drill update form
- add diagram load/save per drill
- add membership management

## Third pass
- add quick-add parser
- add comments and change history
- add image export

---

# Important cautions

## 1. Do not skip RLS
The whole point of Supabase is safe browser access backed by Postgres policies.

## 2. Do not store diagrams as only images
That will block editing later.

## 3. Do not build realtime collaboration first
It sounds attractive, but it is the wrong first investment.

## 4. Keep the workspace model from day one
Retrofitting multi-user support later is painful.

---

# Current gaps in this scaffold

These are not mistakes. They are intentionally left for you to wire:

- real auth actions
- real database reads on pages
- real drill create/update/delete actions
- real diagram save/update logic
- real active workspace selection
- invite flow
- production-ready UI polish

---

# Quick smoke test checklist

Before deploying, verify these:

- app starts locally
- environment variables load
- Supabase project exists
- SQL migration ran successfully
- tables exist
- RLS is enabled
- at least one workspace exists
- your user is in `workspace_members`
- Vercel env vars match local env vars

---

# Source notes

This scaffold is aligned with the current official direction for:
- Next.js App Router and `create-next-app`
- Next.js deployment on Node.js-compatible platforms like Vercel
- Supabase server-side auth patterns for Next.js
- Supabase Row Level Security as the main authorization layer

---

# Practical next move

Get this running in this order:

1. local Next.js app
2. Supabase project and SQL migration
3. local environment variables
4. local app boot
5. one real user + one real workspace
6. Vercel deployment

That will get you to a real online foundation fast instead of drifting into architecture theory.

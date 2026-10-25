# Our Vestaboard

A family-friendly editor for a Vestaboard Flagship (6 rows x 22 columns).

## Setup
1. Vestaboard app > Settings: enable the Read/Write API and copy the key.
2. Supabase: create a project, open the SQL editor, run `supabase.sql`.
   Copy the project URL and the service_role key (Project Settings > API).
3. Push this folder to a GitHub repo and import it in Vercel.
4. In Vercel > Settings > Environment Variables, add the four values from `.env.example`.
5. Deploy. Share the URL and passcode with the family.

Local test: `npm install`, copy `.env.example` to `.env.local`, fill it in, `npm run dev`.

## Notes
- The Vestaboard key and Supabase key only live on the server (API routes), never in the browser.
- Sign-in is one shared passcode plus a name for each person. For per-person accounts, swap in Supabase Auth.
- Color codes 63-68 should be checked against docs.vestaboard.com/docs/charactercodes.

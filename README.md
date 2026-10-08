<p align="center">
  <img src="docs/icon.png" width="72" height="72" alt="" />
</p>

<h1 align="center">ezFinance</h1>

<p align="center">
  Your money, finally making sense.<br />
  Upload a PDF bank statement and get a clear, categorized report you can ask questions about.
</p>

---

## What it does

- **Statement analysis:** reads every transaction in a PDF bank statement, including password-protected ones, and sorts each into one of 16 spending categories.
- **A report you can trust:** balance chart, spending breakdown and totals checked against the statement's own opening and closing balances.
- **An AI assistant:** answers questions about a statement using its actual transactions.
- **Private by default:** the PDF is read in memory and discarded. Reports stay on the user's device unless they choose cloud storage, where the report and chat are encrypted with AES-256-GCM before they're saved.
- **Usage-based plans:** Free, a one-time report, Pro and Business, with allowances, credits and overage tracked in Postgres.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui on Base UI |
| Auth and database | [Supabase](https://supabase.com) (email/password and Google sign-in, Postgres) |
| AI | Any OpenAI-compatible API; defaults to Qwen on Alibaba Cloud DashScope |
| PDF parsing | `pdf-parse` |
| Charts | Chart.js |

## Project structure

```
app/
  (site)/            Pages with the site footer: home, pricing, login, signup, settings
  result/[id]/       A saved report
  api/               Upload, chat, reports, usage, account and auth routes
  icon.tsx           Favicon and install icons, drawn from the wallet mark
  opengraph-image.tsx, twitter-image.tsx   Social share cards
  manifest.ts, robots.ts, sitemap.ts, llms.txt/   Install, crawler and AI metadata
components/          UI, grouped by feature (landing, pricing, report, analyzer…)
lib/
  bank-statement/    PDF reading, transaction extraction, report building, chat
  billing/           Plan usage and credits
  reports/           Where reports are saved, and their encryption
  supabase/          Server and admin Supabase clients
  pricing.ts         Every price and limit, in one place
  site.ts            Site name, copy and public URL used by all metadata
script/              Extraction evals and a plan-granting tool
supabase/migrations/ Database schema
```

## Getting started (development)

### Prerequisites

- Node.js 20.9 or newer
- A [Supabase](https://supabase.com) project
- An API key for an OpenAI-compatible model ([DashScope](https://www.alibabacloud.com/en/product/modelstudio) by default)
- `psql` or the [Supabase CLI](https://supabase.com/docs/guides/cli) to run migrations

### 1. Install

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

| Variable | Required | What it's for |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | Public address for canonical URLs, social cards, the sitemap and `llms.txt`. Defaults to `http://localhost:3000`. |
| `SUPABASE_DB_URI` | Yes | Postgres connection string. The Supabase project URL is derived from it. |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret (service role) key. Server only. |
| `REPORT_ENCRYPTION_KEY` | Yes | Encrypts cloud reports. Generate with `openssl rand -base64 32`. |
| `DASHSCOPE_API_KEY` | Yes | Key for the AI model. |
| `DASHSCOPE_BASE_URL` | No | Any OpenAI-compatible endpoint. Defaults to DashScope international. |
| `DASHSCOPE_MODEL` | No | Model name. Defaults to `qwen3.5-flash`. |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Set if the project URL can't be derived from `SUPABASE_DB_URI`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Kept for reference. Google sign-in is configured in Supabase, not read by the app. |

> [!IMPORTANT]
> Keep `REPORT_ENCRYPTION_KEY` safe and never change it once reports exist: cloud reports encrypted with the old key can't be read with a new one.

### 3. Set up the database

Apply the migrations in order:

```bash
# With the Supabase CLI (linked to your project)
supabase db push

# Or with psql
for f in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URI" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done
```

### 4. Enable sign-in

In the Supabase dashboard, under **Authentication**:

1. Enable **Email** sign-in.
2. To offer Google sign-in, enable the **Google** provider with your Google OAuth client ID and secret.
3. Under **URL Configuration**, add `http://localhost:3000/api/auth/callback` (and your production equivalent) to the redirect URLs.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output |
| `npm run format` | Prettier, including Tailwind class sorting |
| `npm run eval` | Runs extraction on every PDF in `script/statements` and checks it against expected totals. See `script/eval.ts`. |
| `npm run grant -- <email> <free\|pro\|business\|report> [n]` | Gives an account a plan or one-time report credits, until checkout exists |

Statements used by `npm run eval` are personal data: they're git-ignored, so keep them out of commits.

## Production

### Build and run

```bash
npm ci
npm run build
npm run start      # serves on port 3000; set PORT to change it
```

Before going live:

- Set `NEXT_PUBLIC_SITE_URL` to the public domain, such as `https://ezfinance.app`. Canonical URLs, social cards, the sitemap and `llms.txt` use it. On Vercel, the production domain is used when it isn't set.
- Use production values for every variable in the table above. `SUPABASE_SECRET_KEY` and `REPORT_ENCRYPTION_KEY` must only exist on the server.
- Add the production callback URL, `https://<your-domain>/api/auth/callback`, to Supabase's redirect URLs.
- Apply any new migrations before deploying code that depends on them.
- Auth cookies are marked `Secure` when `NODE_ENV=production`, so serve the site over HTTPS.

### Deploying to Vercel

1. Import the repository in Vercel.
2. Add the environment variables under **Settings → Environment Variables**.
3. Deploy. Vercel runs `npm run build` and serves the app; no extra configuration is needed.

Any host that runs Node.js works the same way with `npm run build` and `npm run start`.

> [!NOTE]
> Statement analysis calls the AI model and can take a while on long statements. On serverless hosts, make sure the function timeout allows for it.

## SEO, social and AI metadata

Everything is generated from code, so it stays in step with the product:

| Route | What it is |
| --- | --- |
| `/icon/32`, `/icon/192`, `/icon/512`, `/apple-icon` | The wallet mark as favicon and install icons |
| `/opengraph-image`, `/twitter-image` | Social share cards; the pricing page has its own |
| `/manifest.webmanifest` | Lets the site install to a home screen |
| `/robots.txt` | Allows search and AI crawlers on public pages; keeps reports, settings and the API out |
| `/sitemap.xml` | The public pages |
| `/llms.txt` | A plain-text guide to ezFinance for AI assistants, built from the live plans and FAQs |

Pages also include schema.org JSON-LD: the organization, website and app on every page, plus plan offers and an FAQ on `/pricing`. Site-wide copy lives in `lib/site.ts`, and prices in `lib/pricing.ts`.

## License

Private. All rights reserved.

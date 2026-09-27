# Turborepo starter with shadcn/ui

This is Turborepo starter with shadcn/ui pre-configured.

> [!NOTE]
> This example uses `pnpm` as package manager.

[bun version](https://github.com/dan5py/turborepo-shadcn-ui/tree/bun)

## Using this example

Clone the repository:

```sh
git clone https://github.com/dan5py/turborepo-shadcn-ui.git
```

Install dependencies:

```sh
cd turborepo-shadcn-ui
pnpm install
```

### Add ui components

Use the pre-made script:

```sh
pnpm ui add <component-name>
```

> This works just like the `shadcn/ui` CLI.

### Add a new app

Turborepo offer a simple command to add a new app:

```sh
pnpm turbo gen workspace --name <app-name>
```

This will create a new empty app in the `apps` directory.

If you want, you can copy an existing app with:

```sh
pnpm turbo gen workspace --name <app-name> --copy
```

> [!NOTE]
> Remember to run `pnpm install` after copying an app.

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library (🚀 powered by **shadcn/ui**)
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```sh
cd turborepo-shadcn-ui
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```sh
cd turborepo-shadcn-ui
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd turborepo-shadcn-ui
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```sh
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

Learn more about shadcn/ui:

- [Documentation](https://ui.shadcn.com/docs)

## Data Ingestion & OpenAlex Ingestion Pipeline

### 1. Prerequisites

Ensure your MySQL database is running and Prisma migrations are applied:

```sh
pnpm --filter @repo/database db:migrate:deploy
```

---

### 2. Import 20,000 Papers from OpenAlex

The worker pipeline uses OpenAlex API cursor-based deep pagination to ingest metadata, primary/subfield topics, and authorship records directly into the database.

#### Run Commands

```sh
# Import only papers (default target: 20,000 papers)
pnpm --filter worker import:papers

# Or run full phase 2 ingestion (20,000 papers + 1,000 researchers from OpenAlex)
pnpm --filter worker import:phase2
```

#### Environment Variables (`.env`)

Configure the ingestion behavior with the following environment variables:

```env
# Target count of papers to ingest
IMPORT_PAPER_TARGET=20000

# Batch size per OpenAlex page (supported maximum is 100)
IMPORT_BATCH_SIZE=100

# Publication date filters: specify exact dates (YYYY-MM-DD) or fallback to year range
# If IMPORT_FROM_DATE / IMPORT_TO_DATE are set, they take precedence over the year variables.
IMPORT_FROM_DATE="2024-01-15"
IMPORT_TO_DATE="2026-03-20"
# IMPORT_FROM_YEAR=2024
# IMPORT_TO_YEAR=2026

# Target institution ID on OpenAlex (Default: UIUC - University of Illinois Urbana-Champaign)
UIUC_OPENALEX_INSTITUTION_ID="I157725225"

# Contact email to enter the OpenAlex Polite Pool (faster responses & lower rate limits)
OPENALEX_CONTACT_EMAIL="your-email@illinois.edu"
```

#### Pipeline Features

- **Cursor Pagination (`cursor=*`)**: Bypasses the 10,000 results limit of traditional page-number pagination.
- **Idempotency & Resumability**: Every batch updates the pagination cursor and progress in the `import_runs` table. If interrupted, the job resumes from the latest saved cursor.
- **Polite Pool & Retry Logic**: Automatically includes `mailto` headers and retries up to 4 times with exponential backoff on HTTP 429 and 5xx errors.
- **Relational Mapping**: Maps and upserts into `paper`, `topic`, `paperTopic`, `author`, and `paperAuthor` tables.

---

### 3. Import Faculty / Researchers from CSV or TSV

Faculty can alternatively be imported from a local CSV or TSV file.

#### Run Command

```sh
pnpm --filter worker import:faculty:csv -- /absolute/path/to/faculty.csv
```

#### CSV / TSV Format & Columns

Supports comma-separated (`,`) or tab-separated (`\t`) files. The following header columns are supported:

| Column      | Required | Description                                          |
| :---------- | :------- | :--------------------------------------------------- |
| `email`     | **Yes**  | Researcher email address (used as unique upsert key) |
| `name`      | **Yes**  | Full name                                            |
| `position`  | No       | Faculty role / title (saved to `title`)              |
| `photo_url` | No       | Profile photo URL                                    |
| `keywords`  | No       | Comma-separated research keywords                    |

The job upserts records into `researcher`, updates associated keywords in `researcherKeyword`, and logs the status to `import_runs` with `source: "faculty_csv"`.

### 4. Backfill every saved researcher's papers

Run the researcher-first backfill after importing faculty. It resolves missing
OpenAlex author links using name, UIUC affiliation, email-derived name signals,
and UIUC-affiliated work bylines, then imports every work for the resolved
author with cursor pagination.

```sh
# Resume the latest interrupted run, or start a new run when none exists.
pnpm --filter worker backfill:researcher-papers

# Discard an old checkpoint and scan every researcher again.
pnpm --filter worker backfill:researcher-papers -- --restart

# Backfill one researcher by the researcher table UUID.
pnpm --filter worker backfill:researcher-papers -- --researcher-id=<uuid>
```

The job is idempotent, checkpoints both the active researcher and OpenAlex
works cursor in `import_runs`, skips author matches that remain ambiguous, and
marks new or changed papers as `PENDING` for vector synchronization. Tune it
with `RESEARCHER_PAPER_IMPORT_BATCH_SIZE` (maximum 100) and
`RESEARCHER_PAPER_PERSIST_CONCURRENCY`.

## Vector sync and AI question answering

Start MySQL and Qdrant, then configure the worker from
`apps/worker/.env.example`. Paper and query embeddings run locally with the
same multilingual E5 model; no embedding API key is required.

```sh
pnpm docker:up

# Download/cache the local model on first use, then sync pending papers.
pnpm --filter worker sync:vectors

# Retry records whose previous embedding batch failed.
pnpm --filter worker sync:vectors -- --retry-failed --batch-size=50
```

The sync creates `uiuc_papers_e5_v1` when needed, embeds title/topic/abstract,
upserts vectors and citation payloads into Qdrant, and records status plus a
content hash in MySQL. Re-imported papers are queued again only when their
embedding content changed.

The long-running worker also starts an automatic sync immediately and polls
every 60 seconds by default. Configure it with `VECTOR_SYNC_ENABLED`,
`VECTOR_SYNC_INTERVAL_MS`, and `VECTOR_SYNC_BATCH_SIZE`. The ONNX model is
downloaded once into the shared local cache and reused by both API and worker.

For question answering, add an active default OpenAI credential through
`POST /v1/admin/ai-credentials` (authenticated with
`AI_CREDENTIALS_ADMIN_TOKEN`). The API embeds semantic questions, retrieves
the closest papers from Qdrant, sends only that evidence to the configured
model, and streams the grounded answer from `POST /v1/chat/stream`. Until a
key is configured, the endpoint returns a clear configuration error and never
falls back to a fabricated answer.

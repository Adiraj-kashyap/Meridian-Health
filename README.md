# Meridian Health — Healthcare Appointment & Follow-up Manager

A clinic platform with separate patient, doctor, and admin portals: patients book slots and
describe symptoms in advance, doctors get an AI pre-visit triage summary, post-visit clinical
notes are turned into a plain-language patient summary with a medication schedule, and both
sides stay in sync via email and Google Calendar.

```
Healthcare_Appointment_Manager/
├── backend/    Express + TypeScript API, Prisma/PostgreSQL, background jobs
├── frontend/   React + TypeScript SPA (Vite), Tailwind CSS v4
└── docs/       System design write-up
```

### Deliverables, against the brief

1. **Source code** — this repository (`backend/`, `frontend/`).
2. **README** with setup guide, `.env.example`, API docs, DB schema, LLM prompts, and Google
   Calendar setup steps — this document, sections below.
3. **Hosted application URL** — see [Deployment (Render)](#deployment-render).
4. **System design write-up** (≤800 words) — [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).

## Table of contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Database schema](#database-schema)
4. [API reference](#api-reference)
5. [LLM prompts](#llm-prompts)
6. [Google Calendar setup](#google-calendar-setup)
7. [Email setup](#email-setup)
8. [Deployment (Render)](#deployment-render)
9. [System design write-up](#system-design-write-up)

---

## Quick start

### Windows one-click setup
Double-click **[`start.bat`](start.bat)** at the repo root. It checks Node/Docker, starts Docker
Desktop if it isn't running, brings up Postgres, creates `backend/.env` and `frontend/.env` from
their examples on first run, installs both `npm` dependency trees, runs migrations + seeds demo
data, launches the backend and frontend dev servers in their own windows, and opens
`http://localhost:5173` once it's ready. Safe to re-run any time — it skips steps that are
already done. It won't fill in `GEMINI_API_KEY` / SMTP / Google credentials for you (those are
optional and the app runs fine without them) — edit `backend/.env` afterward if you want those
integrations live.

### Prerequisites (manual setup)
Node.js ≥ 18.18, npm, and either Docker (for local Postgres) or an existing Postgres instance.

### 1. Database
```bash
cd backend
docker compose up -d          # starts Postgres 16 on localhost:5432
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # fill in at least DATABASE_URL and JWT_SECRET
npm install
npm run prisma:migrate        # creates tables from prisma/schema.prisma
npm run seed                  # optional: seeds 1 admin, 2 doctors, 1 patient
npm run dev                   # http://localhost:4000
```
Seeded logins (password `Password123!` for all): `admin@clinic.local`,
`dr.rao@clinic.local` (General Medicine), `dr.iyer@clinic.local` (Cardiology),
`patient@example.com`.

The server boots even with `GEMINI_API_KEY` / SMTP / Google credentials unset — those
integrations degrade gracefully (LLM summaries mark `llmStatus=FAILED` and fall back to raw text;
email queues but doesn't send; calendar sync is skipped) rather than crashing.

### 3. Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev                   # http://localhost:5173
```

### Running tests of the build
```bash
cd backend && npx tsc --noEmit && npx prisma generate
cd frontend && npm run build
```

---

## Environment variables

See [`backend/.env.example`](backend/.env.example) for the full annotated list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | ≥16 chars, signs auth tokens |
| `GEMINI_API_KEY` | no | Enables pre/post-visit AI summaries (Google Gemini) |
| `GEMINI_MODEL` | no | Gemini model id (default `gemini-3.5-flash`) |
| `SMTP_HOST/PORT/USER/PASS` | no | Enables outbound email (any SMTP provider) |
| `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` | no | Enables per-user Google Calendar sync |
| `SLOT_HOLD_MINUTES` | no | How long a slot is reserved while filling the symptom form (default 5) |
| `APPOINTMENT_REMINDER_HOURS_BEFORE` | no | Lead time for the reminder email (default 24) |

Frontend only needs `VITE_API_URL` (see `frontend/.env.example`).

---

## Database schema

Full source of truth: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Summary:

```
User (role: PATIENT|DOCTOR|ADMIN) ─┬─ PatientProfile ─── Appointment ─┬─ SymptomForm (1:1)
                                    │                                  ├─ VisitNote (1:1)
                                    └─ DoctorProfile ──── Appointment ─┤   └─ prescription: Json
                                         ├─ WorkingHour (recurring)    ├─ MedicationReminder[]
                                         └─ LeaveDay (one-off)         └─ Notification[]
GoogleToken (1:1 User) — OAuth refresh/access tokens for Calendar sync
```

**Why the schema looks the way it does:**
- `Appointment` carries `@@unique([doctorId, slotStart])`. This single constraint is what
  makes double-booking structurally impossible — see [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).
- `Appointment.status` includes `HELD`, a state that doesn't exist in most booking schemas —
  it's the slot-hold mechanism: a row is created the instant a patient picks a time, before
  they've even filled the symptom form, so nobody else can grab it out from under them.
- `SymptomForm` / `VisitNote` each carry their own `llmStatus` + `llmError` + `llmRetryCount`
  rather than living on `Appointment` — this isolates "did the AI summary work" from "is the
  appointment valid," so an LLM outage never blocks booking or visit completion.
- `Notification` is a queue table, not a fire-and-forget side effect — `status`, `attempts`,
  `nextAttemptAt`, `lastError` give it its own retry lifecycle independent of the request that
  created it.

---

## API reference

Base URL: `/api`. Auth: `Authorization: Bearer <jwt>` (from `/auth/login` or `/auth/register`).

| Method & path | Role | Purpose |
|---|---|---|
| `POST /auth/register` | public | Create a PATIENT or DOCTOR account |
| `POST /auth/login` | public | Get a JWT |
| `GET /auth/me` | any | Current user profile |
| `GET /doctors?specialization=` | public | Search active doctors |
| `GET /doctors/:id` | public | Doctor detail incl. working hours & upcoming leave |
| `GET /doctors/:id/availability?date=YYYY-MM-DD` | public | Computed open slots for a date |
| `POST /admin/doctors` | ADMIN | Provision a doctor account (returns temp password) |
| `PATCH /admin/doctors/:id` | ADMIN | Update specialization/fee/active status |
| `PUT /admin/doctors/:id/working-hours` | ADMIN | Replace weekly recurring hours |
| `POST /admin/doctors/:id/leave` | ADMIN | Mark a leave day — auto-cancels & notifies affected patients |
| `DELETE /admin/doctors/:id/leave/:leaveId` | ADMIN | Remove a leave day |
| `GET /admin/appointments`, `GET /admin/stats` | ADMIN | Clinic-wide oversight |
| `POST /appointments/hold` | PATIENT | Reserve a slot (`{ doctorId, slotStart }`) |
| `POST /appointments/:id/symptoms` | PATIENT | Submit symptom form → triggers pre-visit LLM |
| `POST /appointments/:id/symptoms/retry-llm` | PATIENT/DOCTOR | Retry a failed pre-visit summary |
| `POST /appointments/:id/confirm` | PATIENT | HELD → CONFIRMED; sends emails, creates calendar events |
| `POST /appointments/:id/cancel` | PATIENT/DOCTOR | Cancel; notifies both parties, removes calendar events |
| `POST /appointments/:id/reschedule` | PATIENT | Move a CONFIRMED appointment to a new slot |
| `POST /appointments/:id/visit-notes` | DOCTOR | Submit clinical notes + prescription → triggers post-visit LLM, expands medication reminders |
| `POST /appointments/:id/visit-notes/retry-llm` | DOCTOR | Retry a failed post-visit summary |
| `GET /appointments/me` | PATIENT/DOCTOR | My appointments |
| `GET /appointments/:id` | owner/ADMIN | Appointment detail |
| `GET /calendar/connect` | any | Google OAuth consent URL |
| `GET /calendar/oauth/callback` | — | OAuth redirect target (Google calls this) |
| `GET /calendar/status` | any | Whether the current user has connected Calendar |

Errors are JSON: `{ "error": "message", "details"?: ... }`. A slot conflict returns **409**;
validation failures return **400** with Zod's field-level details.

---

## LLM prompts

Both prompts follow the brief's guidance verbatim, with a JSON-only response contract added so
the output is machine-parseable (see [`backend/src/modules/llm/llm.service.ts`](backend/src/modules/llm/llm.service.ts)):

**Pre-visit summary**
```
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and
three suggested questions for the doctor. Symptoms: <symptoms>

Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{"urgencyLevel": "Low" | "Medium" | "High", "chiefComplaint": string, "suggestedQuestions": [string, string, string]}
```

**Post-visit summary**
```
Convert these clinical notes into a patient-friendly summary with medication schedule and
follow-up steps: <notes>

Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{"patientSummary": string, "medicationSchedule": string, "followUpSteps": string}
Write in plain, warm, non-clinical language a patient without a medical background can follow.
```

**Failure handling:** every call goes through `callWithRetry` (2 retries, exponential backoff),
and both entry points return a `{ ok: true, data } | { ok: false, error }` union instead of
throwing. On failure the caller persists `llmStatus=FAILED` + `llmError` and the request
completes normally — a booking still confirms, a visit note still saves with the doctor's raw
notes visible to the patient. A manual retry endpoint exists for both summaries so a transient
outage doesn't permanently lose the AI layer for that record.

---

## Google Calendar setup

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External → fill in app name + your email → save.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application**.
   - Authorized redirect URI — exactly: `http://localhost:4000/api/calendar/oauth/callback` (dev),
     plus your deployed backend's equivalent URL in production. Authorized JavaScript origins can
     stay empty — this app uses the server-side redirect flow, not a client-side JS flow.
5. Copy the generated **Client ID** and **Client secret** into `backend/.env` as
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; set `GOOGLE_REDIRECT_URI` to match step 4 exactly.
6. In the app, a logged-in patient or doctor visits **Settings → Connect Google Calendar**, which
   redirects to Google's consent screen (`access_type=offline`, so a refresh token is issued) and
   back to `/api/calendar/oauth/callback`, which stores the tokens against that user.
7. From then on, confirming an appointment creates a calendar event on both the patient's and
   doctor's calendars (if connected); rescheduling updates them; cancelling deletes them. Users
   who haven't connected Calendar are skipped silently — this is optional, not a hard dependency.

**Known limitation — Testing publishing status.** A newly created OAuth consent screen starts in
"Testing" mode, where **only Google accounts explicitly added as test users can complete the
consent flow** — everyone else gets `Error 403: access_denied`. Add testers under **OAuth consent
screen → Test users → Add users**. Moving to "In production" removes that restriction but requires
Google's verification review for a sensitive scope like `calendar.events` (privacy policy, demo
video, etc.) — overkill for a demo/evaluation deployment. For grading purposes, add the
evaluator's Google account as a test user rather than pursuing full verification.

---

## Email setup

Any SMTP provider works — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in
`backend/.env`; `SMTP_SECURE=false` for a STARTTLS port like 587, `true` for an implicit-TLS port
like 465 — these have to match or the connection fails. Options:
- **Gmail** (`smtp.gmail.com`, port 587): use an [app password](https://myaccount.google.com/apppasswords),
  not your regular password. Works well for a demo/evaluation deployment; not meant for real
  production volume — regular Gmail accounts cap out around 500 sends/day and it isn't built as a
  transactional relay.
- **[Mailtrap](https://mailtrap.io)**: free sandbox SMTP, nothing actually leaves the building —
  good for local testing without touching a real inbox.
- **SendGrid / Mailgun / Postmark**: the right choice for real production traffic (generous free
  tiers, built for transactional mail). Swapping providers is a `.env` change only, no code change.

If SMTP is left blank, the app still runs: notifications are created and queued in the
`Notification` table, the background job attempts delivery every minute, fails gracefully, and
retries with backoff — nothing crashes, email just doesn't leave the building until configured.

---

## Deployment (Render)

1. **Database**: Render → New → PostgreSQL (free tier). Copy the "Internal Database URL".
2. **Backend**: Render → New → Web Service → point at `backend/`.
   - Build command: `npm install && npm run build`
   - Start command: `npm run prisma:deploy && npm start`
   - Add all `backend/.env.example` variables as environment variables, using the DB URL from
     step 1 and `FRONTEND_URL` set to your frontend's Render URL.
3. **Frontend**: Render → New → Static Site → point at `frontend/`.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment variable: `VITE_API_URL` = your backend service's URL.
4. Update `GOOGLE_REDIRECT_URI` (and the Google Cloud Console credential) to the deployed
   backend's `/api/calendar/oauth/callback` URL once you have it.

---

## System design write-up

Double-booking prevention, doctor-leave conflict handling, the slot-hold mechanism, and
notification-failure handling are covered in [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md)
(≤800 words, as required).

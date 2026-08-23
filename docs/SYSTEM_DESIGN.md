# System Design Write-up

*(≈780 words)*

## Double-booking prevention

The core guarantee — no two appointments for the same doctor at the same start time — is
enforced at the database layer, not in application logic. `Appointment` carries
`@@unique([doctorId, slotStart])` in the Prisma schema. Application code performs an
optimistic check-then-write inside a transaction (see below), but the constraint is what
actually makes double-booking *impossible* rather than merely *unlikely*: even if two API
instances, two request threads, or two retried requests race to insert a row for the same
doctor+slot at the exact same microsecond, Postgres serializes the two `INSERT`s and lets
exactly one succeed. The loser's insert throws a unique-violation error (Prisma error code
`P2002`), which a global Express error handler catches and converts into an HTTP `409
Conflict` with a human-readable message ("This slot was just taken..."). No distributed lock,
no external mutex, no advisory locking scheme is needed — correctness comes from a property
Postgres already guarantees about unique indexes under concurrent writes. Rescheduling reuses
the same mechanism: moving an appointment's `slotStart` is just another `UPDATE` against the
same unique index, so a reschedule into an occupied slot fails exactly the same way a fresh
booking would.

## Slot hold mechanism

Booking is two steps for a reason: the patient must fill a symptom form (a product
requirement) *before* the appointment is confirmed, and that form-filling takes real time —
during which the slot can't be safely left open for someone else to grab, or the patient
could lose the slot they thought they had while typing. `Appointment.status` includes a
`HELD` state for exactly this: the moment a patient picks a time, a row is created with
`status=HELD` and `holdExpiresAt = now + SLOT_HOLD_MINUTES` (default 5). That row already
occupies the doctor+slotStart unique constraint, so it blocks every other patient from
holding or confirming the same slot — the protection starts at hold time, not confirm time.
If the patient abandons the flow, the hold expires. Two independent mechanisms reclaim an
expired hold: (1) opportunistically, the *next* patient who tries to hold that exact slot
triggers a transactional `DELETE ... WHERE status='HELD' AND holdExpiresAt < now()` for that
doctor+slotStart immediately before their own `INSERT`, so a stale hold never blocks a
legitimate new attempt; and (2) a background cron sweep every 5 minutes deletes any expired
`HELD` row nobody has re-requested, so abandoned holds don't linger indefinitely in a
doctor's schedule. Confirming (`HELD → CONFIRMED`) is a simple update guarded by an
expiry check and a "symptom form must exist" check — no additional locking is needed there
because the concurrency fight already happened at hold time.

## Doctor leave conflict handling

Leave is modeled as its own table (`LeaveDay`, unique on `doctorId + date`) rather than a
flag on `WorkingHour`, so a leave day can be added or removed without touching the recurring
schedule. Availability computation checks `LeaveDay` before generating candidate slots for a
date, so a doctor on leave simply shows zero available slots going forward — that half is
prevention. The harder half is retroactive: when an admin marks a *new* leave day, the system
immediately queries every `CONFIRMED` or still-active `HELD` appointment for that
doctor on that date, and for each one: sets `status=CANCELLED` with
`cancelledReason` recorded, enqueues a `LEAVE_NOTICE` notification to the affected patient
explaining why and apologizing, and tears down that appointment's Google Calendar events (if
any). This all happens synchronously inside the `addLeaveDay` service call, so the admin's
response tells them exactly how many patients were affected — there's no silent gap between
"doctor marked unavailable" and "patients told."

## Notification failure handling

Notifications are never sent inline from the request that triggers them (booking, cancelling,
etc.) — that would mean a slow or down SMTP provider directly slows or breaks the user-facing
action. Instead every notification is a row in a `Notification` table with its own lifecycle:
`status` (`PENDING → SENT | FAILED → ABANDONED`), `attempts`, `maxAttempts` (default 5), and
`nextAttemptAt`. A cron job runs every minute, selects due `PENDING` rows, and attempts
delivery. On failure it doesn't retry immediately — it schedules the next attempt using an
increasing backoff table (1, 5, 15, 60, 240 minutes) and records `lastError`, so a transient
provider blip and a persistent misconfiguration both degrade gracefully instead of hammering
the SMTP server or silently dropping the message. Once `attempts` reaches `maxAttempts` the
row moves to `ABANDONED` rather than retrying forever, and remains queryable for support/admin
visibility. Medication reminders and the pre-appointment reminder both flow through this same
queue — they're just rows created with a future `nextAttemptAt` — so there's exactly one
delivery-and-retry code path in the whole system, not one per notification type.

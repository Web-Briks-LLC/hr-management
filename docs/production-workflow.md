# Production work and ownership

Editors use **My work**: choose an order, select released images or drop filenames,
then take the batch. There is no 300-image batch cap. Only distinct registered
filenames count against the order quantity; retaking a registered file does not.
Filenames are case-sensitive and unique within an order. A dropped file with the
same basename and a different extension takes the existing image record. If
multiple registered files share that basename, the editor must select the exact
image from the available list. Historical copies count once toward order
quantity while their sessions and audit history remain separate. Files are not uploaded.

- **Hold for me** pauses time and keeps ownership. Another batch may be started.
- **Release for others** frees images and keeps previously submitted steps.
  Editors can release the whole batch or drop specific filenames to release only
  those images. The remaining images stay assigned in the same session.
  Unsaved local editing is not automatically marked as a completed step.
- **Submit work** records the selected steps for every image in the batch.
  To submit only part of a batch, release the unfinished images first, then
  submit the remaining batch. Partly completed images become available; fully
  edited images await QC.
- Supervisors can hand over a live/held batch, submit its steps, or release it.
- QC approves submitted images or returns submitted/approved images for revision.
  Revision starts a new step cycle; prior steps remain in the audit snapshot and
  work sessions. Active or held images must be released/submitted before revision.

## Integrity and audit

MongoDB **replica set or sharded cluster is required**. The local Compose setup
already uses a replica set. No non-transactional fallback is allowed.

Start/hold/resume/submit/release/reassign/QC/repair run through
`productionMutation`: sorted order/editor guard documents serialize conflicting
requests across application instances; Mongoose transaction AsyncLocalStorage
propagates the session to queries. Failure rolls back image, session and audit
writes. Socket events are emitted only after commit and discarded on retry.
Independent orders/editors can run concurrently.

`ProductionEvent` is append-only through the application (no update/delete API).
It retains actor, affected names, outgoing/incoming editors, session, notes,
completed steps and pre-change image snapshots. Order history is paginated and
can be filtered by exact filename. Existing sessions and legacy records remain
accessible; events before this release are not fabricated. Database operators
still need ordinary backup and database access controls.

## Rollout and maintenance

1. Confirm replica-set support and run integration tests on a disposable local DB.
2. Deploy backend and frontend together; do not leave old writers running during
   rollout, since older servers do not take the new guard locks.
3. In the server directory run `npx tsx src/scripts/production-locks.ts` to inspect
   stale locks. This is read-only. Review live mismatches manually.
4. To repair verified missing/closed-session locks, run
   `npx tsx src/scripts/production-locks.ts --apply --actor=ADMIN_USER_ID --order=ORDER_ID`.
   Each order is rechecked transactionally and gets an audit event. No historical
   records are deleted. Omitting --order scans all orders.

## Verification

`PRODUCTION_TEST_MONGO=mongodb://127.0.0.1:27017/?directConnection=true npx tsx --test src/tests/production.integration.test.ts`

The test creates and drops only its own uniquely named `production_test_*`
database; it does not read the app's MONGO_URI. It tests large batches, quantity,
retaking work, simultaneous claims, one active session per editor, handover,
partial completion, revision, stale owners, literal search and audit rollback.

UI components: official `shadcn@latest add combobox --yes --overwrite` was run
for this redesign (2026-11-17). It refreshed button/input/textarea dependencies;
the existing combobox/input-group matched the current registry.

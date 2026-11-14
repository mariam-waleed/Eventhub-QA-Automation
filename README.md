# EventHub QA Automation

Playwright + TypeScript automation for **US-114: Book tickets for an event**.

The suite contains **4 UI tests and 5 API tests**, covering booking creation, pricing, My Bookings, cancellation, quantity validation, and seat restoration.

- [Web application](https://eventhub.rahulshettyacademy.com)
- [API documentation](https://api.eventhub.rahulshettyacademy.com/api/docs/)

## Setup

Requirements: **Node.js 24** and npm.

```bash
npm ci
npx playwright install chromium
```

The repository includes `.env` as required by the assessment submission form. It provides:

```dotenv
WEB_BASE_URL=https://eventhub.rahulshettyacademy.com
API_BASE_URL=https://api.eventhub.rahulshettyacademy.com/api/
TEST_EVENT_ID=285
TEST_USER_EMAIL=<assessment-account-email>
TEST_USER_PASSWORD=<assessment-account-password>
```

The values above describe the configuration; the supplied `.env` contains the credentials for running the tests. Keep the trailing slash in `API_BASE_URL`, because API requests use relative paths.

The account must be reserved for this assessment. Do not replace its credentials with personal or reused credentials. GitHub Actions receives credentials through repository secrets.

### Event prerequisites

- `TEST_EVENT_ID` selects the event used by API tests and UI-001/002. It needs at least two available seats.
- UI-003/004 select **World Tech Summit** through `getTestEvent('techSummit')` in `tests/data/booking.data.ts`.
- The sell-out scenario requires **1–10 remaining seats**.
- The single-seat scenario requires **at least two remaining seats**.

Seat counts are read at runtime rather than hardcoded to eight. Existing event availability remains an external dependency.

## Run the tests

| Action | Command |
| --- | --- |
| Check TypeScript | `npx tsc --noEmit` |
| Run all tests | `npx playwright test` |
| Run API tests | `npx playwright test --project=api` |
| Run UI tests visibly | `npx playwright test --project=chromium --headed` |
| Run one scenario | `npx playwright test --grep "US114-UI-003"` |
| Debug UI steps | `npx playwright test --project=chromium --debug` |
| Open the HTML report | `npx playwright show-report` |

## Requirements traceability matrix

| Requirement | Verification | Test IDs |
| --- | --- | --- |
| **AC1:** Submit quantity and contact details; receive confirmation and a booking reference | Confirmation, customer name, and a reference matching the created booking | `US114-UI-001` |
| **AC2:** Total equals ticket price × quantity | UI totals before/after quantity change, confirmation and booking-card totals; API calculation | `US114-UI-001`, `US114-API-001` |
| **AC3:** Booking appears in My Bookings | Matching reference, event title, quantity, and total | `US114-UI-001` |
| **AC4:** Cancel a booking | UI reference remains absent after reload; API retrieval returns 404 after cancellation | `US114-UI-002`, `US114-API-002` |
| **AC5:** Create through `POST /api/bookings` | HTTP 201, saved input, status, reference, total, and retrieval | `US114-API-001` |
| Supporting rule: integer quantity from 1 to 10 | Reject 0, 11, and 1.5 with quantity validation errors | `US114-API-003`, `US114-API-004`, `US114-API-005` |
| Supporting behaviour: sold-out inventory | Book remaining seats, verify sold-out state and disabled booking link, cancel, and verify availability returns | `US114-UI-003` |
| Supporting behaviour: seat restoration | Booking decreases availability by one; cancellation restores the original count | `US114-UI-004` |

The supporting scenarios extend coverage beyond the acceptance criteria.

### Why this coverage?

UI tests verify the customer-visible journey and inventory transitions. API tests check saved booking details, calculation, cancellation, and representative invalid quantity boundaries.

Nine focused tests cover all acceptance criteria and important booking risks within the assessment timeframe, without duplicating every scenario across both interfaces.

## Architecture, growth, and teamwork

| Location | Responsibility |
| --- | --- |
| `src/pages/` | Login, Home, Events, Event Details, and My Bookings page objects |
| `src/components/header.component.ts` | Shared header navigation |
| `src/bookings.api.ts` | API operations and tracking of created booking IDs |
| `tests/fixtures.ts` | Authentication, helper injection, and cleanup |
| `tests/data/booking.data.ts` | Generated contacts, event definitions, and parameterised cases |
| `tests/ui/`, `tests/api/` | Scenarios and assertions |
| `playwright.config.ts` | Projects, execution settings, and reporting |
| `.github/workflows/tests.yml` | CI execution and report upload |

The framework separates responsibilities so new coverage can be added without changing unrelated tests:

- **Page objects** own page-specific locators and actions.
- **Shared components** reuse common behaviour.
- **API helpers** centralise endpoint calls.
- **Fixtures** provide authenticated helpers and manage cleanup.
- **Test data** holds reusable inputs and parameterised cases.
- **Tests** describe scenarios and assert expected behaviour.

Playwright and TypeScript serve both interfaces, keeping one runner, configuration, and reporting system. The design stays proportionate to the assessment without a large inheritance hierarchy or separate locator-only files.

### Contribution conventions

Suites and cases use consistent, traceable names:

```text
US-114 | Book tickets for an event
US114-UI-001 | Book tickets and verify My Bookings
US114-API-001 | Create and retrieve a booking
```

For a new story, contributors add a spec under the relevant interface, reuse fixtures and data, extend the responsible page/API helper, and update the RTM.

This keeps changes local and makes coverage easier to maintain as the team and suite grow. Parallel execution would require isolated accounts/events; the current suite deliberately uses one worker.

### Framework-managed authentication

Individual tests do not manage credentials, login, or tokens.

- The first UI test in a worker signs in and caches authentication state in memory.
- Later UI tests receive fresh browser contexts using that state.
- A restarted worker authenticates again.
- API fixtures authenticate per test and provide a Bearer-authenticated request context.

Authentication reuse is separate from test data: each test has its own booking and cleanup tracker.

## Test data and cleanup

Each test creates its own prerequisite booking and uses generated contact data. No test consumes another test’s booking.

- API helpers track created IDs before scenario assertions and delete them during teardown, including after failures.
- API cleanup accepts 404 when a cancellation test has already deleted its booking.
- UI scenarios explicitly cancel their bookings on the successful path.
- UI fixture teardown cancels remaining tracked references after failures.
- Cleanup errors fail the run.
- The suite does not automatically clear all My Bookings, delete registered accounts, or reset existing events.

Closing the browser or logging out does not remove server-side bookings.

Tests run with **one worker** and no automatic test retries to reduce interference and avoid repeated booking attempts. Avoid overlapping local and CI runs using the same account.

### Known limitations

UI cleanup depends on capturing the confirmation reference. If creation succeeds but the reference cannot be read, or execution is forcibly terminated, manual cleanup may be needed.

Tests do not intentionally depend on execution order. However, shared inventory changes or failed cleanup can affect subsequent tests.

### Credential handling

The committed `.env` fulfils the submission requirement. This is an assessment-specific exception; in a production framework, credentials would be supplied through untracked environment configuration or a secret manager.

CI uses GitHub Secrets. No custom password encryption is introduced, and cached UI authentication remains in memory.

## Story review

US-114 describes the main journey but leaves several business rules unclear.

| Area | Question for the Product Owner |
| --- | --- |
| User identity | The observed UI requires authentication. Should “visitor” mean a registered, signed-in user, with authentication stated as a prerequisite? |
| Contact validation | What formats and length limits apply? May attendee details differ from account details? |
| Quantity and capacity | Should the story state the documented 1–10 integer limit and available-seat restriction? |
| Event eligibility | When does booking close for started or ended events? Are featured practice events intentionally exempt? |
| Cancellation | Who may cancel, until when, and should cancellation delete the booking or retain a cancelled record? |
| Repeated/concurrent requests | How should duplicate submissions and competition for the last seats be handled? |
| API scope | Does AC5 cover creation only or the complete booking lifecycle? |

### Working assumptions

- Booking requires authentication, consistent with observed UI behaviour.
- Quantity follows the documented 1–10 integer range and available capacity.
- Total follows AC2: unit price multiplied by quantity.
- Cancellation follows the documented deletion behaviour.
- Configured UI events display prices in USD.

### Observations and documentation differences

These observations require clarification rather than automatically being classified as application defects.

| Observation | Treatment |
| --- | --- |
| API `totalPrice` returned as a string, while documentation examples show a number | Convert explicitly for calculation assertions; clarify the response type contract |
| UI practice references use `D-`, while documentation describes `EVT-` | Verify a non-empty, consistent reference without enforcing an unconfirmed prefix |
| An ended featured event remained bookable | The UI labels it “always available for practice”; clarify this exception before reporting a date-validation defect |

## GitHub Actions

The workflow runs on **every push** and supports manual execution. It:

1. Sets up Node.js 24 and installs locked dependencies.
2. Checks TypeScript.
3. Installs Chromium and its system dependencies.
4. Runs UI and API tests.
5. Uploads the HTML report with seven-day retention.

Required repository secrets:

```text
TEST_USER_EMAIL
TEST_USER_PASSWORD
```

CI runs are serialised to avoid overlapping use of the test account. CI traces are disabled because authentication traces can expose credentials; local failure traces should remain private.

## Validation

TypeScript checking and all **9 tests passed locally** during implementation.

Use the GitHub Actions result and HTML report for the submitted commit as its CI execution evidence. External availability and network conditions can affect future runs.

## With more time

- Create/delete test-owned events for deterministic inventory and safer parallel execution.
- Capture UI booking identifiers earlier to strengthen failure cleanup.
- Add unauthenticated and cross-account access tests.
- Verify ordinary-event booking cutoffs, concurrency, and duplicate submissions.
- Expand contact validation, decimal pricing, and browser coverage.
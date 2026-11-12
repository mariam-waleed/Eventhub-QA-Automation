# EventHub QA Automation

Playwright and TypeScript tests for US-114: booking tickets for an event.

The suite covers the UI booking journey and API booking behaviour. GitHub Actions runs both projects on every push.

## Setup

Requirements: Node.js 24 and npm.

```bash
npm ci
npx playwright install chromium
```

Copy `.env.example` to `.env` and enter your registered EventHub test credentials.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Required configuration:

```dotenv
WEB_BASE_URL=https://eventhub.rahulshettyacademy.com
API_BASE_URL=https://api.eventhub.rahulshettyacademy.com/api/
TEST_EVENT_ID=285
TEST_USER_EMAIL=your-test-account-email
TEST_USER_PASSWORD=your-test-account-password
```

Keep the trailing slash in `API_BASE_URL`; API clients use relative paths.

Event 285 was the featured practice event used during implementation. If it becomes unavailable, configure another suitable event with at least two available seats.

Real credentials belong in `.env`, which is ignored by Git. Reviewer credentials are supplied privately with the submission.

## Run

Check TypeScript:

```bash
npx tsc --noEmit
```

Run all tests:

```bash
npx playwright test
```

Run API tests:

```bash
npx playwright test --project=api
```

Run UI tests with a visible browser:

```bash
npx playwright test --project=chromium --headed
```

Open the HTML report:

```bash
npx playwright show-report
```

## Coverage

The suite contains five API tests and one complete UI journey.

| Test | What it verifies | Requirement |
| --- | --- | --- |
| UI booking journey | Increase quantity to two, verify total, enter contact details, confirm, and display a reference and customer name. | AC1, AC2 |
| Same UI journey | Find the matching reference in My Bookings. | AC3 |
| Same UI journey | Cancel the booking and verify its reference remains absent after reload. | AC4 |
| API creation and retrieval | Create a booking and verify contact details, quantity, calculated total, status, reference, and persistence. | AC2, AC5 |
| API cancellation | Cancel a booking and verify retrieval returns 404. | Booking lifecycle |
| API quantity validation | Reject 0, 11, and 1.5 with validation errors. | Documented 1–10 integer rule |

The UI test follows the requested customer journey. API tests isolate backend creation, cancellation, and quantity validation.

I chose a small suite covering all acceptance criteria, with additional boundary cases, rather than duplicating every scenario across both layers.

## Structure and decisions

```text
src/
  bookings.api.ts
  booking.page.ts
tests/
  fixtures.ts
  api/bookings.spec.ts
  ui/bookings.spec.ts
.github/workflows/tests.yml
```

- `bookings.api.ts` contains API calls and tracks created booking IDs.
- `booking.page.ts` contains browser interactions and tracks UI booking references.
- `fixtures.ts` handles authentication, provides helpers, and runs cleanup.
- Tests contain scenario assertions.

Authentication is handled by the framework. API tests receive a Bearer-authenticated request context; UI tests receive a signed-in page. Individual tests do not repeat login logic.

Playwright and TypeScript serve both layers, keeping one runner, configuration, and reporting system.

Tests run with one worker to limit interference in the shared environment. Automatic test retries are disabled. The API login request allows one connection-reset retry; booking creation is not automatically retried because it could create duplicates.

## Test data and cleanup

Each booking uses generated contact data.

API cleanup deletes only IDs returned from creation requests made by the current test. It runs during fixture teardown, including after assertion failures. A 404 during cleanup is accepted because cancellation tests already delete their bookings.

UI cleanup cancels only references captured from the current test's confirmation screen. It uses the UI rather than assuming featured practice bookings share the API's storage.

Cleanup failures are reported. The suite does not clear all bookings, delete accounts, or modify existing events.

A remaining limitation is that a UI booking may require manual cleanup if creation succeeds but its confirmation reference cannot be read. Forced process termination can also prevent teardown.

## Story review

US-114 defines the main journey but leaves several business rules unclear.

| Area | Question for the Product Owner |
| --- | --- |
| User identity | Does “visitor” include guests, or must users sign in before booking? |
| Ownership | Should users be able to retrieve and cancel only their own bookings? |
| Contact validation | What formats and length limits apply? Can attendee details differ from account details? |
| Event eligibility | Can past or started events be booked? Are featured practice events exempt? |
| Availability | Do featured practice events follow the same capacity restrictions as other events? |
| Cancellation | Is there a cancellation deadline? |
| Duplicate submission | Should repeated confirmation or request retries create separate bookings? |
| API scope | Does AC5 cover creation only, or also retrieval and cancellation? |

### Rules clarified by the API documentation

The documentation specifies:

- All five booking input fields are required.
- Quantity must be an integer from 1 to 10.
- Creation checks event existence and capacity, calculates the total, and atomically creates the booking and decrements seats.
- Successful creation returns 201.
- Invalid input or insufficient seats returns 400.
- A missing event returns 404.
- Cancellation permanently deletes the booking and restores its seats.

The disappearance of a cancelled booking from My Bookings therefore agrees with the documented deletion behaviour.

### Findings

| Finding | Evidence and treatment |
| --- | --- |
| Price response type differs from documentation examples | API creation returned totalPrice as the string `"600"`, while Swagger examples show a number. The calculation test explicitly converts it to a number; this difference is recorded separately. |
| Reference format differs | Documentation describes EVT-XXXXXX, while the manual UI walkthrough returned D-XECJYK. Tests check a non-empty, consistent reference rather than enforce the disputed prefix. |
| Cancellation documentation is ambiguous | Listing supports status=cancelled, while cancellation is described as permanent deletion. Clarification is needed on when cancelled records can exist. |
| Authentication declaration is incomplete | Login instructs Bearer authentication, but booking operations do not clearly declare endpoint-specific security and authentication error responses. Authenticated requests work; unauthenticated and cross-account behaviour remain unverified. |
| Response example has inconsistent IDs | An example booking contains eventId=3 while its nested event has id=1. This is a documentation example inconsistency. |
| Past event was bookable | The manual walkthrough booked an event dated 20 October 2026 on 12 November 2026. It was labelled always available for practice, so this is a clarification rather than a confirmed defect. |

Observed behaviour is not automatically treated as the intended requirement. Findings distinguish documentation differences from confirmed application failures.

### Assumptions

- The assessed journey uses a dedicated registered account.
- Quantity follows the documented 1–10 integer range.
- Total follows AC2: unit price multiplied by quantity.
- Cancellation follows the documented deletion contract.
- Prices are displayed in USD for the configured event.
- Existing practice-event availability is an external dependency.

## GitHub Actions — bonus

`.github/workflows/tests.yml` runs on every push and supports manual execution.

It:

1. Checks out the repository.
2. Sets up Node.js 24.
3. Installs locked dependencies with npm ci.
4. Checks TypeScript.
5. Installs Chromium and its system dependencies.
6. Runs API and UI tests.
7. Uploads the HTML report with seven-day retention.

Configure these repository secrets:

- TEST_USER_EMAIL
- TEST_USER_PASSWORD

Workflow runs are serialised to avoid overlapping runs using the same account. Local runs should also avoid overlapping CI runs with that account.

CI tracing is disabled because login traces can contain credentials. Local failure traces are retained for debugging and should remain private.

## Validation

- Five API tests passed locally.
- The complete UI booking and cancellation journey passed locally.
- GitHub Actions successfully completed TypeScript checking, API/UI execution, and HTML report upload.

The application is a shared external environment, so availability and network conditions can affect future runs.

## With more time

- Add guest, unauthenticated, and cross-account access tests after clarifying the contract.
- Use isolated test-created events for deterministic capacity and seat-restoration checks.
- Verify concurrent booking requests cannot oversell a limited-capacity event.
- Expand contact validation and decimal-price cases.
- Add cancellation-dismissal coverage and additional browsers.
- Capture UI-created booking identifiers earlier to improve cleanup when confirmation rendering fails.
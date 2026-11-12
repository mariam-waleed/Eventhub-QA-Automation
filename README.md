# EventHub booking automation

Practical assessment for US-114: Book tickets for an event.

## Current status

This initial commit contains the story review and proposed automation scope. Automated tests and GitHub Actions are not implemented yet. Run instructions and execution results will be added when the framework is working.

- Application: https://eventhub.rahulshettyacademy.com
- API documentation: https://api.eventhub.rahulshettyacademy.com/api/docs/
- API base URL: https://api.eventhub.rahulshettyacademy.com/api

## Story review

The story covers booking creation, total calculation, visibility in My Bookings, cancellation, and API creation. It describes the main outcome, but omits several rules needed to define positive and negative tests.

I used the acceptance criteria as the starting point, then compared the supplied UI walkthrough with the Swagger documentation. Existing behaviour is recorded as an observation, not automatically treated as the intended requirement. The documentation review did not execute API requests.

### Questions for the Product Owner

| Area | Missing or unclear rule | Question |
| --- | --- | --- |
| Identity and ownership | The actor is a visitor, but booking ownership is not defined. | Must visitors sign in to book? Can users retrieve and cancel only their own bookings? |
| Contact validation | AC1 names the fields without defining validation. | What name and phone formats and length limits apply? Can attendee details differ from the signed-in account? |
| Event eligibility | Past events and practice-event exceptions are unspecified. | Can past or started events be booked? Are featured practice events exempt from date or capacity restrictions? |
| Cancellation eligibility | AC4 allows cancellation without a deadline. | Can a booking be cancelled at any time, including after the event starts? |
| API scope | AC5 says the same works but names only POST /api/bookings. | Is API acceptance limited to creation, or does it also include retrieval and cancellation? |
| Repeated submission | Retry and double-click behaviour is unspecified. | Should repeated confirmation create separate bookings, or should duplicate submissions be prevented? |

### Rules clarified by the API documentation

These rules are missing from the story but have a documented basis for testing:

| Area | Documented contract |
| --- | --- |
| Authentication | Login returns a JWT; the login description instructs clients to send it as a Bearer token on subsequent requests. Endpoint-specific enforcement still needs verification. |
| Required booking fields | eventId, customerName, customerEmail, customerPhone, quantity. |
| Quantity | Integer from 1 to 10. |
| Creation | Verify the event and capacity, calculate the price, generate a unique reference, and atomically create the booking and decrement seats. |
| Creation responses | 201 for success, 400 for validation errors or insufficient seats, 404 for a missing event. |
| Retrieval | Retrieve bookings by numeric ID or reference; listing is paginated. |
| Cancellation | DELETE /api/bookings/{id} permanently deletes the booking and atomically restores its seats; documented responses include 200 and 404. |

AC2 explicitly defines total price as ticket price multiplied by quantity. The API request example does not include a client-supplied total; tests should calculate the expected price independently.

### UI exploration evidence

The supplied manual walkthrough on 12 November 2026 shows:

- A registered, signed-in user opened an event booking form.
- Quantity initially displayed 1, with a maximum of 10 indicated. Boundary enforcement has not yet been checked.
- Name, email, and phone were marked required.
- Booking eight tickets at $300 produced a $2,400 confirmation with reference D-XECJYK.
- The same reference, quantity, total, and event appeared in My Bookings.
- Cancellation opened a confirmation dialog describing irreversible cancellation and release of eight seats.
- After confirmation, the booking disappeared and an empty state appeared.

This walkthrough supports AC1–AC4 for one example. It does not establish API correctness, guest behaviour, server-side validation, or actual seat restoration. Cancellation disappearing from the UI is consistent with the documented permanent deletion; it is not a defect on that evidence.

### Discrepancies and documentation gaps

| Finding | Evidence | Assessment / follow-up |
| --- | --- | --- |
| Reference format differs | Swagger describes EVT-XXXXXX; the UI walkthrough produced D-XECJYK. | Observed documentation/UI mismatch. Confirm whether practice bookings intentionally use another prefix. AC1 itself does not prescribe a prefix. |
| Cancelled filter conflicts with deletion description | GET /bookings supports status=cancelled, while DELETE permanently deletes bookings. | Documentation ambiguity: clarify when cancelled records can exist. |
| Authentication contract is incomplete | Login instructs Bearer authentication, but booking operations lack the lock shown for /auth/me and omit authentication error responses. | Verify actual protection and account isolation before asserting specific unauthorized status codes. |
| Response example IDs disagree | A booking example has eventId=3 but its nested event has id=1. | Documentation example inconsistency; real responses should be checked separately. |
| Past event can be booked in the walkthrough | Event date was 20 October 2026; booking date was 12 November 2026. The event also says it is always available for practice. | Clarification needed, not a confirmed defect: this may be an intentional practice exception. |

No additional application defect is claimed without reproducible evidence and an agreed or documented expectation.

### Working assumptions

- Use a dedicated registered test account for the initial authenticated flow; guest support remains unresolved.
- Use the documented 1–10 integer quantity range and AC2 price formula.
- Treat cancellation as deletion and seat restoration, following the API documentation.
- Do not assert the EVT- reference prefix until its discrepancy is resolved; verify a non-empty reference and consistent identity across views instead.
- Operate only on resources created by the current test. Do not clear all bookings as routine teardown.
- Use isolated test-created events for exact inventory assertions if supported. Shared-event inventory can change independently of the test.

## Proposed automation scope

This is planned coverage, not a report of completed or passing tests.

| Layer | Scenario | Reason |
| --- | --- | --- |
| UI | Book multiple tickets; verify total, confirmation reference, and the matching My Bookings entry. | Covers AC1–AC3 through the customer journey. |
| UI | Confirm cancellation and verify the targeted booking disappears. | Covers AC4. |
| UI | Dismiss cancellation and verify the booking remains. | Protects against accidental cancellation introduced by the confirmation interaction. |
| UI | Verify quantity controls at 1 and 10 and required-field validation. | Covers visible boundaries and form validation. |
| API | Create and retrieve a booking; verify submitted details, total, status, and reference. | Covers AC5 and persistence. |
| API | Cancel a booking; verify it can no longer be retrieved. | Verifies the documented lifecycle and supports cleanup. |
| API | Reject quantity 0, 11, and a fractional value. | Exercises lower, upper, and integer boundaries. |
| API | Reject insufficient capacity and verify no inventory change. | Protects against overselling and partial writes; requires controlled event data. |
| API | Verify missing/invalid authentication and cross-account access after clarifying the contract. | Covers booking ownership and access control. |

UI tests focus on user interactions; API tests cover backend rules directly. This keeps duplication limited while testing both entry points. Scope may be reduced based on the assessment timebox, with omissions recorded explicitly.

## Planned framework decisions

- Playwright with TypeScript for both UI and API: one runner, language, configuration, and reporting system.
- Framework fixtures own authentication. Tests receive an authenticated page or API client without repeating login or token-header construction.
- Page objects contain UI interactions; API clients contain endpoint calls. Tests own scenario expectations.
- Fixtures track created booking IDs and clean up in teardown, including after assertion failures. Cleanup errors must be visible.
- Each test creates its prerequisites and can run independently. UI cancellation may use API setup to stay focused on cancellation.
- Credentials come from environment variables. Passwords, tokens, and browser authentication state must not be committed.
- GitHub Actions will run tests on push and retain failure diagnostics once implementation is ready.

## Running the tests

Not available in this initial documentation commit. Exact installation commands, environment variables, execution commands, and validated runtime requirements will be added alongside the implementation.

Dedicated assessment credentials will be supplied privately with the submission. No credentials are included in this repository.

## With more time

- Verify simultaneous booking requests against a controlled limited-capacity event to test the documented atomicity guarantee.
- Expand browser coverage after establishing a reliable Chromium baseline.
- Investigate token expiry and cross-account isolation in greater depth.
- Add decimal-price cases and broader contact-validation coverage once the rules are confirmed.
- Resolve the documentation discrepancies and refine tests against the agreed contract.

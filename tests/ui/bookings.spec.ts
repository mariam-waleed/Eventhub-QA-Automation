import {
  createContactDetails,
  getTestEvent,
} from '../data/booking.data';
import { test, expect } from '../fixtures';

const inventoryEvent = getTestEvent('techSummit');

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function availabilityPattern(quantity: number): RegExp {
  return new RegExp(
    `^\\s*${quantity}\\s+seats?\\s+(?:available|left!)\\s*$`,
    'i',
  );
}

test.describe('US-114 | Book tickets for an event', () => {
  test('US114-UI-001 | Book tickets and verify My Bookings', async ({
    ui,
    bookings,
  }) => {
    const eventId = Number(process.env.TEST_EVENT_ID);

    expect(Number.isInteger(eventId) && eventId > 0).toBe(true);

    const eventResponse = await bookings.getEvent(eventId);
    expect(eventResponse.status()).toBe(200);

    const eventBody = await eventResponse.json();
    const event = eventBody.data;
    const unitPrice = Number(event.price);

    expect(Number.isFinite(unitPrice)).toBe(true);
    expect(unitPrice).toBeGreaterThanOrEqual(0);

    const contact = createContactDetails();

    await ui.home.open();
    await ui.home.header.openEvents();

    await expect(ui.events.heading).toBeVisible();
    await ui.events.openEvent(event.title);

    await expect(ui.eventDetails.totalRow).toContainText(
      formatPrice(unitPrice),
    );

    await ui.eventDetails.addTicket();

    await expect(ui.eventDetails.totalRow).toContainText(
      formatPrice(unitPrice * 2),
    );

    await ui.eventDetails.enterDetails(contact);

    const reference = await ui.eventDetails.confirm();

    await expect(ui.eventDetails.confirmationHeading).toBeVisible();
    await expect(ui.eventDetails.customerName(contact.name)).toBeVisible();

    await expect(ui.eventDetails.totalRow).toContainText(
      formatPrice(unitPrice * 2),
    );

    await ui.eventDetails.viewBookings();
    await ui.myBookings.waitUntilReady();

    await expect(ui.myBookings.reference(reference)).toBeVisible();

    const bookingCard = ui.myBookings.card(reference);

    await expect(bookingCard).toContainText(event.title);
    await expect(bookingCard).toContainText('2 tickets');

    await expect(
      bookingCard.getByText(formatPrice(unitPrice * 2), {
        exact: true,
      }),
    ).toBeVisible();

    // Fixture teardown cancels this test's booking.
    // Restore server state before this test finishes.
// Fixture teardown remains the fallback if an earlier assertion fails.
await ui.myBookings.cancel(reference);
await ui.myBookings.reload();

await expect(
  ui.myBookings.reference(reference),
).toHaveCount(0);
  });

  test('US114-UI-002 | Cancel an existing booking', async ({
    ui,
    bookings,
  }) => {
    const eventId = Number(process.env.TEST_EVENT_ID);

    expect(Number.isInteger(eventId) && eventId > 0).toBe(true);

    const eventResponse = await bookings.getEvent(eventId);
    expect(eventResponse.status()).toBe(200);

    const eventBody = await eventResponse.json();

    // Each test creates its own prerequisite booking.
    await ui.home.open();
    await ui.home.header.openEvents();

    await expect(ui.events.heading).toBeVisible();
    await ui.events.openEvent(eventBody.data.title);

    await ui.eventDetails.enterDetails(createContactDetails());

    const reference = await ui.eventDetails.confirm();

    await ui.eventDetails.viewBookings();
    await ui.myBookings.waitUntilReady();

    await expect(ui.myBookings.reference(reference)).toBeVisible();

    await ui.myBookings.cancel(reference);
    await ui.myBookings.reload();

    await expect(ui.myBookings.reference(reference)).toHaveCount(0);
  });

  test('US114-UI-003 | Sell out an event and restore availability after cancellation', async ({
    ui,
  }) => {
    await ui.events.open();
    await expect(ui.events.heading).toBeVisible();

    const availableBefore = await ui.events.availableSeats(
      inventoryEvent.title,
    );

    expect(
      availableBefore,
      'Inventory event must have at least one available seat',
    ).toBeGreaterThan(0);

    expect(
      availableBefore,
      'All remaining seats must fit within the ten-ticket booking limit',
    ).toBeLessThanOrEqual(10);

    await ui.events.openEvent(inventoryEvent.title);
    await ui.eventDetails.selectQuantity(availableBefore);
    await ui.eventDetails.enterDetails(createContactDetails());

    const reference = await ui.eventDetails.confirm();

    // Reopen the catalogue to check persisted inventory.
    await ui.events.open();

    const bookingLink = ui.events.bookingLink(inventoryEvent.title);

    await expect(
      ui.events.inventoryLabel(inventoryEvent.title),
    ).toHaveText('SOLD OUT');

    await expect(bookingLink).toBeVisible();
    await expect(bookingLink).toHaveText('Sold Out');
    await expect(bookingLink).toHaveAttribute('aria-disabled', 'true');

    await ui.myBookings.open();
    await ui.myBookings.cancel(reference);

    await ui.events.open();

    await expect(
      ui.events.inventoryLabel(inventoryEvent.title),
    ).toHaveText(availabilityPattern(availableBefore));

    const restoredBookingLink = ui.events.bookingLink(inventoryEvent.title);

    await expect(restoredBookingLink).toBeVisible();
    await expect(restoredBookingLink).toHaveText('Book Now');
    await expect(restoredBookingLink).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  test('US114-UI-004 | Decrease availability by one and restore it after cancellation', async ({
    ui,
  }) => {
    await ui.events.open();
    await expect(ui.events.heading).toBeVisible();

    const availableBefore = await ui.events.availableSeats(
      inventoryEvent.title,
    );

    expect(
      availableBefore,
      'Inventory event needs at least two available seats',
    ).toBeGreaterThanOrEqual(2);

    await ui.events.openEvent(inventoryEvent.title);
    await ui.eventDetails.selectQuantity(1);
    await ui.eventDetails.enterDetails(createContactDetails());

    const reference = await ui.eventDetails.confirm();

    await ui.events.open();

    await expect(
      ui.events.inventoryLabel(inventoryEvent.title),
    ).toHaveText(availabilityPattern(availableBefore - 1));

    await ui.myBookings.open();
    await ui.myBookings.cancel(reference);

    await ui.events.open();

    await expect(
      ui.events.inventoryLabel(inventoryEvent.title),
    ).toHaveText(availabilityPattern(availableBefore));

    const restoredBookingLink = ui.events.bookingLink(inventoryEvent.title);

    await expect(restoredBookingLink).toBeVisible();
    await expect(restoredBookingLink).toHaveText('Book Now');
    await expect(restoredBookingLink).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });
});
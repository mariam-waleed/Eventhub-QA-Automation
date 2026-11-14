import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';

test.describe('US-114 | Book tickets for an event', () => {
  test('US114-UI-001 | Book tickets, verify My Bookings, and cancel', async ({
    ui,
    bookings,
  }) => {
    const eventId = Number(process.env.TEST_EVENT_ID);

    expect(Number.isInteger(eventId) && eventId > 0).toBe(true);

    const eventResponse = await bookings.getEvent(eventId);
    expect(eventResponse.status()).toBe(200);

    const eventBody = await eventResponse.json();
    const unitPrice = Number(eventBody.data.price);

    expect(Number.isFinite(unitPrice)).toBe(true);
    expect(unitPrice).toBeGreaterThanOrEqual(0);

    const formatPrice = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

    const contact = {
      name: `QA ${randomUUID().slice(0, 8)}`,
      email: `qa-${randomUUID()}@example.com`,
      phone: '+919876543210',
    };

await ui.home.open();
await ui.home.header.openEvents();

await expect(ui.events.heading).toBeVisible();

await ui.events.openEvent(eventBody.data.title);
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

    await ui.myBookings.cancel(reference);
    await ui.myBookings.reload();

    await expect(ui.myBookings.reference(reference)).toHaveCount(0);
  });
});
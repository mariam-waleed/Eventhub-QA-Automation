import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';

test('books two tickets, displays the booking, and cancels it', async ({
  bookingPage,
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

  await bookingPage.openEvent(eventId);

  // Check the initial total and the recalculation after increasing quantity.
  await expect(bookingPage.totalRow()).toContainText(
    formatPrice(unitPrice),
  );

  await bookingPage.addTicket();

  await expect(bookingPage.totalRow()).toContainText(
    formatPrice(unitPrice * 2),
  );

  await bookingPage.enterDetails(contact);

  const reference = await bookingPage.confirm();

  await expect(
    bookingPage.page.getByText('Booking Confirmed!', { exact: false }),
  ).toBeVisible();

  await expect(bookingPage.bookingReference(reference)).toBeVisible();

  await expect(
    bookingPage.page.getByText(contact.name, { exact: true }),
  ).toBeVisible();

  await expect(bookingPage.totalRow()).toContainText(
    formatPrice(unitPrice * 2),
  );

  await bookingPage.viewBookings();

  await expect(bookingPage.page).toHaveURL(/\/bookings\/?$/);

  await expect(bookingPage.bookingReference(reference)).toBeVisible();

  await bookingPage.cancel(reference);

  await expect(bookingPage.bookingReference(reference)).toHaveCount(0);

  // Confirm it stays absent after reloading.
  await bookingPage.page.reload();

  await expect(
    bookingPage.page.getByRole('heading', {
      name: 'My Bookings',
      exact: true,
    }),
  ).toBeVisible();

  await expect(bookingPage.bookingReference(reference)).toHaveCount(0);
});
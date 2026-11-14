import {
  createContactDetails,
  invalidQuantityCases,
} from '../data/booking.data';
import { test, expect } from '../fixtures';
import type { BookingInput } from '../../src/bookings.api';

function eventId(): number {
  const id = Number(process.env.TEST_EVENT_ID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('TEST_EVENT_ID must be a positive integer.');
  }

  return id;
}

function bookingInput(quantity = 2): BookingInput {
  const contact = createContactDetails();

  return {
    eventId: eventId(),
    customerName: contact.name,
    customerEmail: contact.email,
    customerPhone: contact.phone,
    quantity,
  };
}

test.describe('US-114 | Book tickets for an event', () => {
  test.beforeEach(async ({ bookings }) => {
    const response = await bookings.getEvent(eventId());

    expect(response.status(), 'Configured test event must exist').toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(
      body.data.availableSeats,
      'Configured test event needs at least two available seats',
    ).toBeGreaterThanOrEqual(2);
  });

  test('US114-API-001 | Create and retrieve a booking', async ({
    bookings,
  }) => {
    const input = bookingInput();

    const eventResponse = await bookings.getEvent(input.eventId);
    expect(eventResponse.status()).toBe(200);

    const eventBody = await eventResponse.json();
    const unitPrice = Number(eventBody.data.price);

    expect(Number.isFinite(unitPrice)).toBe(true);
    expect(unitPrice).toBeGreaterThanOrEqual(0);

    const response = await bookings.create(input);

    expect(response.status()).toBe(201);

    const body = await response.json();
    const booking = body.data;

    expect(body.success).toBe(true);
    expect(booking.id).toEqual(expect.any(Number));
    expect(booking.id).toBeGreaterThan(0);

    expect(booking).toMatchObject({
      ...input,
      status: 'confirmed',
    });

    expect(booking.totalPrice).toEqual(expect.anything());

    const totalPrice = Number(booking.totalPrice);

    expect(Number.isFinite(totalPrice)).toBe(true);
    expect(totalPrice).toBeCloseTo(unitPrice * input.quantity, 2);

    expect(booking.bookingRef).toEqual(expect.any(String));
    expect(booking.bookingRef.trim().length).toBeGreaterThan(0);

    const savedResponse = await bookings.get(booking.id);

    expect(savedResponse.status()).toBe(200);

    const savedBody = await savedResponse.json();

    expect(savedBody.success).toBe(true);
    expect(savedBody.data).toMatchObject({
      id: booking.id,
      ...input,
      bookingRef: booking.bookingRef,
      totalPrice: booking.totalPrice,
      status: 'confirmed',
    });
  });

  test('US114-API-002 | Cancel an existing booking', async ({
    bookings,
  }) => {
    const createdResponse = await bookings.create(bookingInput());

    expect(createdResponse.status()).toBe(201);

    const createdBody = await createdResponse.json();
    const id = createdBody.data.id;

    const cancelledResponse = await bookings.cancel(id);

    expect(cancelledResponse.status()).toBe(200);

    const cancelledBody = await cancelledResponse.json();

    expect(cancelledBody.success).toBe(true);

    const retrievedResponse = await bookings.get(id);

    expect(retrievedResponse.status()).toBe(404);
  });

  for (const testCase of invalidQuantityCases) {
    test(`${testCase.id} | ${testCase.description}`, async ({
      bookings,
    }) => {
      const response = await bookings.create(
        bookingInput(testCase.quantity),
      );

      expect(response.status()).toBe(400);

      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');

      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'quantity',
          }),
        ]),
      );
    });
  }
});
import type { APIRequestContext } from '@playwright/test';

export type BookingInput = {
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
};

export class BookingsApi {
  private readonly createdIds = new Set<number>();

  constructor(private readonly request: APIRequestContext) {}

  async create(input: BookingInput) {
    const response = await this.request.post('bookings', {
      data: input,
    });

    // Track before assertions so failed tests can still clean up.
    if (response.ok()) {
      const body = await response.json();

      if (Number.isInteger(body.data?.id)) {
        this.createdIds.add(body.data.id);
      } else {
        throw new Error('Booking creation response is missing its numeric ID.');
      }
    }

    return response;
  }

  get(id: number) {
    return this.request.get(`bookings/${id}`);
  }

  cancel(id: number) {
    return this.request.delete(`bookings/${id}`);
  }

  getEvent(id: number) {
    return this.request.get(`events/${id}`);
  }

  async cleanup() {
    const failures: string[] = [];

    for (const id of this.createdIds) {
      try {
        const response = await this.cancel(id);

        // A test may already have cancelled its booking.
        if (response.status() !== 200 && response.status() !== 404) {
          failures.push(`Booking ${id}: HTTP ${response.status()}`);
        }
      } catch {
        failures.push(`Booking ${id}: cleanup request failed`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Cleanup failed:\n${failures.join('\n')}`);
    }
  }
}
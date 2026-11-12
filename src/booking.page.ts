import { expect, type Page } from '@playwright/test';

type ContactDetails = {
  name: string;
  email: string;
  phone: string;
};

export class BookingPage {
  private readonly references = new Set<string>();

  constructor(readonly page: Page) {}

  async openEvent(id: number) {
    await this.page.goto(`/events/${id}`);
  }

  async enterDetails(details: ContactDetails) {
    await this.page
      .getByRole('textbox', { name: 'Full Name*', exact: true })
      .fill(details.name);

    await this.page.getByTestId('customer-email').fill(details.email);

    await this.page
      .getByRole('textbox', { name: 'Phone Number*', exact: true })
      .fill(details.phone);
  }

  async addTicket() {
    await this.page
      .getByRole('button', { name: '+', exact: true })
      .click();
  }

  totalRow() {
    return this.page.getByText('Total', { exact: true }).locator('..');
  }

  async confirm(): Promise<string> {
    await this.page
      .getByRole('button', { name: 'Confirm Booking', exact: true })
      .click();

    const referenceRow = this.page
      .getByText('Booking Ref', { exact: true })
      .locator('..');

    await expect(referenceRow).toBeVisible();

    const text = await referenceRow.innerText();
    const reference = text.replace('Booking Ref', '').trim();

    if (!reference) {
      throw new Error('Confirmation did not contain a booking reference.');
    }

    this.references.add(reference);
    return reference;
  }

  async viewBookings() {
    await this.page
      .getByRole('button', { name: 'View My Bookings', exact: true })
      .click();
  }

  bookingReference(reference: string) {
    return this.page.getByText(reference, { exact: true });
  }

  private bookingCard(reference: string) {
    // Find the nearest container holding this reference and its cancel button.
    return this.bookingReference(reference).locator(
      'xpath=ancestor::*[.//*[@data-testid="cancel-booking-btn"]][1]',
    );
  }

  async cancel(reference: string) {
    await this.bookingCard(reference)
      .getByTestId('cancel-booking-btn')
      .click();

    await this.page.getByTestId('confirm-dialog-yes').click();

    await expect(this.bookingReference(reference)).toHaveCount(0);

    this.references.delete(reference);
  }

  async cleanup() {
    if (this.references.size === 0) {
      return;
    }

    await this.page.goto('/bookings');

    // Wait for the booking list to finish loading before looking for our records.
    await expect(
      this.page.getByRole('heading', {
        name: 'My Bookings',
        exact: true,
      }),
    ).toBeVisible();

    for (const reference of this.references) {
      await this.cancel(reference);
    }
  }
}
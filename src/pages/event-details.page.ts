import { expect, type Locator, type Page } from '@playwright/test';

export type ContactDetails = {
  name: string;
  email: string;
  phone: string;
};

export class EventDetailsPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly addTicketButton: Locator;
  readonly confirmButton: Locator;
  readonly viewBookingsButton: Locator;
  readonly totalRow: Locator;
  readonly referenceRow: Locator;
  readonly confirmationHeading: Locator;

  constructor(
    private readonly page: Page,
    private readonly trackBooking: (reference: string) => void,
  ) {
    this.nameInput = page.getByRole('textbox', {
      name: 'Full Name*',
      exact: true,
    });

    this.emailInput = page.getByTestId('customer-email');

    this.phoneInput = page.getByRole('textbox', {
      name: 'Phone Number*',
      exact: true,
    });

    this.addTicketButton = page.getByRole('button', {
      name: '+',
      exact: true,
    });

    this.confirmButton = page.getByRole('button', {
      name: 'Confirm Booking',
      exact: true,
    });

    this.viewBookingsButton = page.getByRole('button', {
      name: 'View My Bookings',
      exact: true,
    });

    this.totalRow = page.getByText('Total', { exact: true }).locator('..');

    this.referenceRow = page
      .getByText('Booking Ref', { exact: true })
      .locator('..');

    this.confirmationHeading = page.getByText('Booking Confirmed!', {
      exact: false,
    });
  }

  async open(id: number) {
    await this.page.goto(`/events/${id}`);
  }

  async enterDetails(details: ContactDetails) {
    await this.nameInput.fill(details.name);
    await this.emailInput.fill(details.email);
    await this.phoneInput.fill(details.phone);
  }

  async addTicket() {
    await this.addTicketButton.click();
  }

  async confirm(): Promise<string> {
    await this.confirmButton.click();
    await expect(this.referenceRow).toBeVisible();

    const text = await this.referenceRow.innerText();
    const reference = text.replace('Booking Ref', '').trim();

    if (!reference) {
      throw new Error('Confirmation did not contain a booking reference.');
    }

    this.trackBooking(reference);
    return reference;
  }

  customerName(name: string) {
    return this.page.getByText(name, { exact: true });
  }

  async viewBookings() {
    await this.viewBookingsButton.click();
  }
}
import { expect, type Locator, type Page } from '@playwright/test';

export class MyBookingsPage {
  readonly heading: Locator;
  readonly confirmCancellationButton: Locator;

  constructor(private readonly page: Page,
  private readonly onCancelled: (reference: string) => void,) {
    this.heading = page.getByRole('heading', {
      name: 'My Bookings',
      exact: true,
    });

    this.confirmCancellationButton =
      page.getByTestId('confirm-dialog-yes');
  }

  async open() {
    await this.page.goto('/bookings');
    await this.waitUntilReady();
  }

  async waitUntilReady() {
    await expect(this.heading).toBeVisible();
  }

  reference(reference: string) {
    return this.page.getByText(reference, { exact: true });
  }

  private card(reference: string) {
    return this.reference(reference).locator(
      'xpath=ancestor::*[.//*[@data-testid="cancel-booking-btn"]][1]',
    );
  }

  async cancel(reference: string) {
    await this.card(reference)
      .getByTestId('cancel-booking-btn')
      .click();

    await this.confirmCancellationButton.click();

    await expect(this.reference(reference)).toHaveCount(0);
    this.onCancelled(reference);
  }

  async reload() {
    await this.page.reload();
    await this.waitUntilReady();
  }
}
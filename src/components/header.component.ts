import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  readonly homeLink: Locator;
  readonly eventsLink: Locator;
  readonly myBookingsLink: Locator;

  constructor(page: Page) {
    const header = page.locator('header');

    this.homeLink = header.getByRole('link', {
      name: 'Home',
      exact: true,
    });

 this.eventsLink = page.getByTestId('nav-events');

    this.myBookingsLink = header.getByRole('link', {
      name: 'My Bookings',
      exact: true,
    });
  }

  async openHome() {
    await this.homeLink.click();
  }

  async openEvents() {
    await this.eventsLink.click();
  }

  async openMyBookings() {
    await this.myBookingsLink.click();
  }
}
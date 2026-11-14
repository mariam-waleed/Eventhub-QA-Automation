import { expect, type Locator, type Page } from '@playwright/test';
import { HeaderComponent } from '../components/header.component';

export class EventsPage {
  readonly header: HeaderComponent;
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);

    this.heading = page.getByRole('heading', {
      name: 'Upcoming Events',
      exact: true,
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/events');
    await expect(this.heading).toBeVisible();
  }

  card(title: string): Locator {
    return this.page.getByTestId('event-card').filter({
      has: this.page.getByRole('heading', {
        name: title,
        exact: true,
      }),
    });
  }

  bookingLink(title: string): Locator {
    return this.card(title).getByTestId('book-now-btn');
  }

  inventoryLabel(title: string): Locator {
    // Targets the inventory span beside the booking link.
    // Excludes the image badge and the "Sold Out" link.
    return this.bookingLink(title).locator(
      'xpath=preceding-sibling::div/span',
    );
  }

  async availableSeats(title: string): Promise<number> {
    const label = this.inventoryLabel(title);

    await expect(label).toBeVisible();

    const text = (await label.innerText()).trim();

    if (/^SOLD OUT$/i.test(text)) {
      return 0;
    }

    const match = /^(\d+)\s+seats?\s+(?:available|left!)$/i.exec(text);

    if (!match) {
      throw new Error(
        `Unexpected inventory text for "${title}": "${text}"`,
      );
    }

    return Number(match[1]);
  }

  async openEvent(title: string): Promise<void> {
    const link = this.bookingLink(title);

    await expect(link).toHaveAttribute('aria-disabled', 'false');
    await link.click();
  }
}
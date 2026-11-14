import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByRole('textbox', {
      name: 'Email',
      exact: true,
    });

    this.passwordInput = page.getByRole('textbox', {
      name: 'Password',
      exact: true,
    });

    this.signInButton = page.getByRole('button', {
      name: 'Sign In',
      exact: true,
    });
  }

  async open() {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();

    await expect(this.page).not.toHaveURL(/\/login\/?$/, {
      timeout: 20_000,
    });
  }
}
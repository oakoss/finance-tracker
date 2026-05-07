import { test as base } from '@playwright/test';
import { MailpitClient } from 'mailpit-api';

type Fixtures = { mailpit: MailpitClient };

export const test = base.extend<Fixtures>({
  mailpit: async ({}, use) => {
    const client = new MailpitClient('http://localhost:8025');
    await client.deleteMessages();
    await use(client);
  },
});

export { expect } from '@playwright/test';

import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// Stage 3c: Find, Find support, FAQ, How to use, Add to phone.

async function open(page: Page, hash: string) {
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

async function addContact(page: Page, name: string) {
  await open(page, '#contacts');
  await page.getByRole('button', { name: 'Add a contact' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a contact' });
  await dialog.getByRole('textbox', { name: 'Name or organisation' }).fill(name);
  await dialog.getByRole('button', { name: 'Save contact' }).click();
  await expect(dialog).toBeHidden();
}

test('Find searches the record, filters, and remembers what was opened', async ({ page }) => {
  await addContact(page, 'Headway helpline');
  await open(page, '#home');
  await page.getByRole('button', { name: 'Quick Note', exact: true }).click();
  const note = page.getByRole('dialog', { name: 'Quick Note' });
  await note.getByRole('textbox', { name: 'Your note' }).fill('Ask Headway about the support group');
  await note.getByRole('button', { name: 'Save as Quick Note' }).click();

  await page.getByRole('button', { name: 'Find in my record' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Find in my record' })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Quick answers' })).toContainText('Money spent£0.00');
  await page.getByRole('searchbox', { name: 'Search your record' }).fill('headway');
  await expect(page.getByRole('status').filter({ hasText: '2 results' })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel('Show').selectOption('notes');
  await expect(page.getByRole('status').filter({ hasText: '1 result' })).toBeVisible();
  await page.getByLabel('Show').selectOption('all');

  await page.getByRole('button', { name: 'Headway helpline' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts & important numbers' })).toBeFocused();
  await page.goBack();
  await page.getByRole('searchbox', { name: 'Search your record' }).fill('');
  await expect(page.getByRole('region', { name: 'Recently opened' })).toContainText('Headway helpline');

  await page.getByRole('searchbox', { name: 'Search your record' }).fill('zebra');
  await expect(page.getByText('Nothing in your record matches that.')).toBeVisible();
});

test('Find support lists urgent help first, with links that work', async ({ page }) => {
  await open(page, '#support');
  const urgent = page.getByRole('region', { name: 'If you need help now' });
  await expect(urgent.getByRole('link', { name: '999' })).toHaveAttribute('href', 'tel:999');
  await expect(urgent.getByRole('link', { name: '116 123' })).toHaveAttribute('href', 'tel:116123');
  await page.getByText('Brain injury and stroke').click();
  await expect(page.getByRole('link', { name: /Headway website/ })).toHaveAttribute('href', 'https://www.headway.org.uk');
  await expectNoAxeViolations(page);
});

test('the FAQ can be searched', async ({ page }) => {
  await open(page, '#faq');
  await page.getByRole('searchbox', { name: 'Search the questions' }).fill('private');
  await expect(page.getByRole('status')).toContainText(/questions? match/);
  await expect(page.getByText('What does “Keep this private” do?')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search the questions' }).fill('xylophone');
  await expect(page.getByText('No questions match that.')).toBeVisible();
});

test('the Home prompt to add to phone can be dismissed, and stays dismissed', async ({ page }) => {
  await open(page, '#home');
  const prompt = page.getByRole('complementary', { name: 'Keep Say It Once on your phone' });
  await expect(prompt).toBeVisible();
  await prompt.getByRole('link', { name: /See how/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Keep Say It Once on your phone' })).toBeFocused();
  await expect(page.getByText('your record doesn’t move with it yet')).toBeVisible();
  await page.goBack();
  await prompt.getByRole('button', { name: 'Not now' }).click();
  await expect(prompt).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Find support' }).first()).toBeVisible();
  await expect(prompt).toBeHidden();
});

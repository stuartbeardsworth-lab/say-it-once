import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const screens = [
  { hash: '#home', heading: /Keep everything together/ },
  { hash: '#what', heading: 'What happened' },
  { hash: '#impact', heading: 'How it affects me' },
  { hash: '#changes', heading: 'Changes over time' },
  { hash: '#track', heading: 'Keep track' },
  { hash: '#appointments', heading: 'Appointments' },
  { hash: '#treatment', heading: 'Treatment & medication' },
  { hash: '#costs', heading: 'Costs & lost income' },
  { hash: '#documents', heading: 'Letters & documents' },
  { hash: '#contacts', heading: 'Contacts & important numbers' },
  { hash: '#quick-notes', heading: 'Quick Notes' },
  { hash: '#records', heading: 'My records' },
  { hash: '#find', heading: 'Find in my record' },
  { hash: '#support', heading: 'Find support' },
  { hash: '#faq', heading: 'Questions and answers' },
  { hash: '#how-to-use', heading: 'How to use Say It Once' },
  { hash: '#add-to-phone', heading: 'Keep Say It Once on your phone' },
  { hash: '#privacy', heading: 'Privacy & backup' },
  { hash: '#building-blocks', heading: 'Building blocks' },
  { hash: '#nowhere', heading: 'Page not found' },
] as const;

// WCAG 2.2 AA, the target in CLAUDE.md.
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} element(s))`);
  expect(summary).toEqual([]);
}

export async function chooseTextSize(page: Page, label: 'Standard' | 'Large' | 'Larger' | 'Largest') {
  await page.getByRole('button', { name: 'Text size' }).click();
  // Click the visible label, as a person would; the real radio input is
  // visually hidden inside it.
  await page.getByRole('dialog', { name: 'Text size' }).getByText(label, { exact: true }).click();
  await expect(page.getByRole('radio', { name: label })).toBeChecked();
  await page.getByRole('button', { name: 'Done' }).click();
}

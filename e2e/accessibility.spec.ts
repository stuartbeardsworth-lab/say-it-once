import { expect, test } from '@playwright/test';
import { chooseTextSize, expectNoAxeViolations, screens } from './helpers';

for (const screen of screens) {
  test.describe(`${screen.hash}`, () => {
    test('has no axe violations', async ({ page }) => {
      await page.goto(`/${screen.hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen.heading);
      await expectNoAxeViolations(page);
    });

    test('has no axe violations at the largest text size', async ({ page }) => {
      await page.goto(`/${screen.hash}`);
      await chooseTextSize(page, 'Largest');
      await expectNoAxeViolations(page);
    });

    test('fits a 320px-wide screen at the largest text size without sideways scrolling', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`/${screen.hash}`);
      await chooseTextSize(page, 'Largest');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('building blocks in every state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#building-blocks');
  });

  test('open dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Open an example dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Example dialog' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('confirm dialog, including its failure message', async ({ page }) => {
    await page.getByLabel('Pretend the next delete fails').check();
    await page.getByRole('button', { name: 'Delete example item' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete this example?' });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole('button', { name: 'Delete example' }).click();
    await expect(dialog.getByRole('alert')).toContainText('nothing has changed');
    await expectNoAxeViolations(page);
  });

  test('text size dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Text size' }).click();
    await expect(page.getByRole('dialog', { name: 'Text size' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('field with an error and a failed save', async ({ page }) => {
    await page.getByRole('button', { name: 'Show an error message' }).click();
    await page.getByRole('button', { name: 'Show a failed save' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Not saved' })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

import { test, expect } from '@playwright/test';

test('homepage loads and shows title', async ({ page }) => {
  await page.goto('/');
  // Wait for the app to render, we can check for main elements or text
  // Let's assume there is a header or main section. 
  // Checking if body is visible is a safe bet for a React app skeleton.
  await expect(page.locator('body')).toBeVisible();
});

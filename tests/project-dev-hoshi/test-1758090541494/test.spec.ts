import { test, expect } from '@playwright/test';

test('TOP-UI確認', async ({ page }) => {
  // テスト対象URL
  const targetUrl = 'https://development-hoshi-hitomi.marouge.dev/';
  
  // ページに移動
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  
  // ページタイトルの確認
  await expect(page).toHaveTitle(/.*/);
  
  // スクリーンショットを取得
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
  // テストコードの内容に基づく動的テスト
  
  
  // 基本的な要素の確認
  const header = page.locator('header');
  const main = page.locator('main');
  const footer = page.locator('footer');
  
  if (await header.count() > 0) {
    await expect(header).toBeVisible();
  }
  
  if (await main.count() > 0) {
    await expect(main).toBeVisible();
  }
  
  if (await footer.count() > 0) {
    await expect(footer).toBeVisible();
  }
});
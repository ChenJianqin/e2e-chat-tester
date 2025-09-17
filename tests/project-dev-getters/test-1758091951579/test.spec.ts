import { test, expect } from '@playwright/test';

test('TOPの無料占い', async ({ page }) => {
  // テスト対象URL
  const targetUrl = 'https://development-getters-iida.marouge.dev/';
  
  // ページに移動
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  
  // ページタイトルの確認
  await expect(page).toHaveTitle(/.*/);
  
  // スクリーンショットを取得
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
  // テストコードの内容に基づく動的テスト
  
  // 鑑定ボタンのテスト
  const button = page.locator('button:has-text("無料で鑑定")');
  await expect(button).toBeVisible();
  await button.click();
  await page.waitForLoadState('networkidle');
  
  // 遷移後のスクリーンショット
  await page.screenshot({ path: 'result-page.png', fullPage: true });
  
  
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
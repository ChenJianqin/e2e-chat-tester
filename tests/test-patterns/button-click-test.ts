import { Page } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface ButtonClickTestConfig {
  buttonText: string;
  expectedUrl?: string;
  waitTime?: number;
  screenshotAfterClick?: boolean;
}

export async function runButtonClickTest(
  page: Page,
  config: ButtonClickTestConfig,
  screenshotsDir: string
): Promise<{ success: boolean; message: string; screenshots: string[] }> {
  const screenshots: string[] = [];
  
  try {
    // ページの状態をリセット（必要に応じて）
    const initialUrl = page.url();
    if (initialUrl.includes('/result/')) {
      // 結果ページにいる場合は、トップページに戻る
      await page.goto(initialUrl.split('/free-fortune')[0] + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }
    
    // ボタンを検索
    const button = page.locator(`button:has-text("${config.buttonText}")`);
    const buttonCount = await button.count();
    
    if (buttonCount === 0) {
      return {
        success: false,
        message: `「${config.buttonText}」ボタンが見つかりません`,
        screenshots: []
      };
    }

    // ボタンが表示されていることを確認
    const isVisible = await button.first().isVisible();
    if (!isVisible) {
      return {
        success: false,
        message: `「${config.buttonText}」ボタンは存在しますが非表示です`,
        screenshots: []
      };
    }

    // ボタンをクリック
    await button.first().click();
    
    // 指定された時間待機（デフォルト3秒）
    const waitTime = config.waitTime || 3000;
    await page.waitForTimeout(waitTime);

    // ページ遷移を待機
    await page.waitForLoadState('networkidle');

    // 現在のURLを取得
    const currentUrl = page.url();

    // 期待されるURLと比較
    if (config.expectedUrl && currentUrl !== config.expectedUrl) {
      return {
        success: false,
        message: `URLが期待値と異なります。期待: ${config.expectedUrl}, 実際: ${currentUrl}`,
        screenshots: []
      };
    }

    // クリック後のスクリーンショットを取得
    if (config.screenshotAfterClick !== false) {
      const screenshot = await page.screenshot({ 
        type: 'png', 
        fullPage: true 
      });
      const filename = `button-click-${Date.now()}.png`;
      const filepath = join(screenshotsDir, filename);
      await writeFile(filepath, screenshot);
      
      // Webアクセス可能なパスを生成
      const relativePath = `/screenshots/${filename}`;
      screenshots.push(relativePath);
    }

    return {
      success: true,
      message: `「${config.buttonText}」ボタンのクリックが成功しました。遷移先URL: ${currentUrl}`,
      screenshots
    };

  } catch (error) {
    return {
      success: false,
      message: `ボタンクリックテストでエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      screenshots
    };
  }
}

import { Page } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface FormTestConfig {
  formSelector?: string;
  inputFields: Array<{
    selector: string;
    value: string;
    type?: 'text' | 'email' | 'password' | 'number';
  }>;
  submitButtonSelector?: string;
  expectedUrl?: string;
  screenshotAfterSubmit?: boolean;
}

export async function runFormTest(
  page: Page,
  config: FormTestConfig,
  screenshotsDir: string
): Promise<{ success: boolean; message: string; screenshots: string[] }> {
  const screenshots: string[] = [];
  
  try {
    // フォームを検索
    const form = config.formSelector 
      ? page.locator(config.formSelector)
      : page.locator('form').first();
    
    const formCount = await form.count();
    if (formCount === 0) {
      return {
        success: false,
        message: 'フォームが見つかりません',
        screenshots: []
      };
    }

    // 各入力フィールドに値を入力
    for (const field of config.inputFields) {
      const input = form.locator(field.selector);
      const inputCount = await input.count();
      
      if (inputCount === 0) {
        return {
          success: false,
          message: `入力フィールド「${field.selector}」が見つかりません`,
          screenshots
        };
      }

      // フィールドをクリアしてから値を入力
      await input.clear();
      await input.fill(field.value);
    }

    // 送信ボタンをクリック
    const submitButton = config.submitButtonSelector
      ? form.locator(config.submitButtonSelector)
      : form.locator('button[type="submit"], input[type="submit"]').first();
    
    const buttonCount = await submitButton.count();
    if (buttonCount === 0) {
      return {
        success: false,
        message: '送信ボタンが見つかりません',
        screenshots
      };
    }

    await submitButton.click();
    
    // ページ遷移を待機
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 現在のURLを取得
    const currentUrl = page.url();

    // 期待されるURLと比較
    if (config.expectedUrl && currentUrl !== config.expectedUrl) {
      return {
        success: false,
        message: `URLが期待値と異なります。期待: ${config.expectedUrl}, 実際: ${currentUrl}`,
        screenshots
      };
    }

    // 送信後のスクリーンショットを取得
    if (config.screenshotAfterSubmit !== false) {
      const screenshot = await page.screenshot({ 
        type: 'png', 
        fullPage: true 
      });
      const filename = `form-submit-${Date.now()}.png`;
      const filepath = join(screenshotsDir, filename);
      await writeFile(filepath, screenshot);
      
      // Webアクセス可能なパスを生成
      const relativePath = `/screenshots/${filename}`;
      screenshots.push(relativePath);
    }

    return {
      success: true,
      message: `フォーム送信が成功しました。遷移先URL: ${currentUrl}`,
      screenshots
    };

  } catch (error) {
    return {
      success: false,
      message: `フォームテストでエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      screenshots
    };
  }
}

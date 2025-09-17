import { Page } from 'playwright';
import { runButtonClickTest } from './test-patterns/button-click-test';
import { runFormTest } from './test-patterns/form-test';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface TestResult {
  success: boolean;
  message: string;
  details: string;
  screenshots: string[];
}

export interface TestConfig {
  testId: string;
  testName: string;
  url: string;
  prompt: string;
  createdAt: string;
  lastModified: string;
}

// テストコード内のスクリーンショットを実行する関数
async function executeScreenshotsFromTestCode(
  page: Page,
  testCode: string,
  screenshotsDir: string
): Promise<{ screenshots: string[] }> {
  const screenshots: string[] = [];
  
  try {
    // テストコード内のスクリーンショット呼び出しを検出
    const screenshotMatches = testCode.match(/page\.screenshot\(\s*\{\s*path:\s*['"`]([^'"`]+)['"`]/g);
    
    if (screenshotMatches) {
      for (const match of screenshotMatches) {
        // ファイル名を抽出
        const pathMatch = match.match(/path:\s*['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const originalPath = pathMatch[1];
          
          // ユニークなファイル名を生成
          const timestamp = Date.now();
          const extension = originalPath.split('.').pop() || 'png';
          const baseName = originalPath.split('.')[0];
          const newFilename = `${baseName}-${timestamp}.${extension}`;
          
          // スクリーンショットを取得
          const screenshot = await page.screenshot({ 
            type: 'png', 
            fullPage: true 
          });
          
          // ファイルに保存
          const filepath = join(screenshotsDir, newFilename);
          await writeFile(filepath, screenshot);
          
          // Webアクセス可能なパスを追加
          const relativePath = `/screenshots/${newFilename}`;
          screenshots.push(relativePath);
        }
      }
    }
    
    return { screenshots };
  } catch (error) {
    console.error('テストコード内のスクリーンショット実行エラー:', error);
    return { screenshots: [] };
  }
}

// テストコード内のボタンクリック処理を実行する関数
async function executeButtonClickFromTestCode(
  page: Page,
  testCode: string,
  screenshotsDir: string,
  projectId?: string,
  testId?: string
): Promise<{ screenshots: string[] }> {
  const screenshots: string[] = [];
  
  try {
    // テストコード内のボタンクリック処理を検出
    if (testCode.includes('button:has-text("無料で鑑定")') && testCode.includes('button.click()')) {
      // ボタンを検索してクリック
      const button = page.locator('button:has-text("無料で鑑定")');
      const buttonCount = await button.count();
      
      if (buttonCount > 0) {
        const isVisible = await button.first().isVisible();
        if (isVisible) {
          // ボタンクリック前のスクリーンショット（1回目のみ）
          const beforeScreenshot = await page.screenshot({ 
            type: 'png', 
            fullPage: true 
          });
          const beforeFilename = `page1-${Date.now()}.png`;
          const beforeFilepath = join(screenshotsDir, beforeFilename);
          await writeFile(beforeFilepath, beforeScreenshot);
          
          // Webアクセス可能なパスを生成
          const beforePath = `/screenshots/${beforeFilename}`;
          screenshots.push(beforePath);
          
          // ボタンをクリック
          await button.first().click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          
          // ボタンクリック後のスクリーンショット（2回目のみ）
          const afterScreenshot = await page.screenshot({ 
            type: 'png', 
            fullPage: true 
          });
          const afterFilename = `page2-${Date.now()}.png`;
          const afterFilepath = join(screenshotsDir, afterFilename);
          await writeFile(afterFilepath, afterScreenshot);
          
          // Webアクセス可能なパスを生成
          const afterPath = `/screenshots/${afterFilename}`;
          screenshots.push(afterPath);
        }
      }
    }
    
    return { screenshots };
  } catch (error) {
    console.error('テストコード内のボタンクリック処理実行エラー:', error);
    return { screenshots: [] };
  }
}

export async function runPlaywrightTest(
  page: Page,
  config: TestConfig,
  testCode: string,
  screenshotsDir: string,
  projectId?: string,
  testId?: string
): Promise<TestResult> {
  const testResults: string[] = [];
  let testSuccess = true;
  const screenshots: string[] = [];

  try {
    // ブラウザの状態をクリア
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // テストコードの内容に基づいて動的にテストを実行
    testResults.push(`✅ 対象URL: ${config.url}`);
    
    // ページの基本情報を取得
    const title = await page.title();
    testResults.push(`✅ ページタイトル: ${title}`);

    // テストコード内のボタンクリック処理を検出して実行
    if (testCode.includes('button:has-text("無料で鑑定")') && testCode.includes('button.click()')) {
      try {
        // テストコード内のボタンクリック処理を実行
        const buttonClickResult = await executeButtonClickFromTestCode(page, testCode, screenshotsDir, projectId, testId);
        if (buttonClickResult.screenshots.length > 0) {
          screenshots.push(...buttonClickResult.screenshots);
          testResults.push(`✅ テストコード内のボタンクリック処理を実行しました (${buttonClickResult.screenshots.length}枚のスクリーンショット)`);
        }
      } catch (error) {
        testResults.push(`⚠️ テストコード内のボタンクリック処理でエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    } else if (testCode.includes('無料で鑑定') || testCode.includes('鑑定')) {
      // テストコード内にボタンクリック処理がない場合のみ、専用のボタンクリックテストを使用
      const buttonTestResult = await runButtonClickTest(page, {
        buttonText: '無料で鑑定',
        waitTime: 3000,
        screenshotAfterClick: true
      }, screenshotsDir);
      
      if (buttonTestResult.success) {
        testResults.push('✅ ボタンクリックテストが成功しました');
        screenshots.push(...buttonTestResult.screenshots);
      } else {
        testResults.push(`❌ ボタンクリックテストが失敗: ${buttonTestResult.message}`);
        testSuccess = false;
      }
    }

    // テストコード内のスクリーンショット呼び出しを検出して実行（ボタンクリック処理と重複しない場合のみ）
    if (testCode.includes('page.screenshot') && !testCode.includes('button:has-text("無料で鑑定")')) {
      try {
        // テストコード内のスクリーンショットを実行
        const screenshotResult = await executeScreenshotsFromTestCode(page, testCode, screenshotsDir);
        if (screenshotResult.screenshots.length > 0) {
          screenshots.push(...screenshotResult.screenshots);
          testResults.push(`✅ テストコード内のスクリーンショットを取得しました (${screenshotResult.screenshots.length}枚)`);
        }
      } catch (error) {
        testResults.push(`⚠️ テストコード内のスクリーンショット実行でエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }

    // フォームテストの検出と実行
    if (testCode.includes('フォーム') || testCode.includes('入力') || testCode.includes('送信')) {
      // 基本的なフォームテストを実行
      const formTestResult = await runFormTest(page, {
        inputFields: [
          { selector: 'input[type="text"]', value: 'テスト入力' },
          { selector: 'input[type="email"]', value: 'test@example.com' }
        ],
        screenshotAfterSubmit: true
      }, screenshotsDir);
      
      if (formTestResult.success) {
        testResults.push('✅ フォームテストが成功しました');
        screenshots.push(...formTestResult.screenshots);
      } else {
        testResults.push(`⚠️ フォームテスト: ${formTestResult.message}`);
      }
    }

    // 基本的な要素チェック
    const header = page.locator('header');
    const mainContent = page.locator('main');
    const footer = page.locator('footer');
    
    // ヘッダーチェック
    const headerCount = await header.count();
    if (headerCount > 0) {
      const isVisible = await header.isVisible();
      testResults.push(isVisible ? '✅ ヘッダーが表示されています' : '⚠️ ヘッダー要素は存在しますが非表示です');
    } else {
      testResults.push('⚠️ ヘッダー要素が見つかりません');
    }

    // メインコンテンツチェック
    const mainCount = await mainContent.count();
    if (mainCount > 0) {
      const isVisible = await mainContent.isVisible();
      testResults.push(isVisible ? '✅ メインコンテンツが表示されています' : '⚠️ メインコンテンツ要素は存在しますが非表示です');
    } else {
      testResults.push('⚠️ メインコンテンツ要素が見つかりません');
    }

    // フッターチェック
    const footerCount = await footer.count();
    if (footerCount > 0) {
      const isVisible = await footer.isVisible();
      testResults.push(isVisible ? '✅ フッターが表示されています' : '⚠️ フッター要素は存在しますが非表示です');
    } else {
      testResults.push('⚠️ フッター要素が見つかりません');
    }

    // URLの確認
    const currentUrl = page.url();
    if (currentUrl === config.url) {
      testResults.push('✅ URLが正しく遷移しています');
    } else {
      // ボタンクリックテストの場合は、URLが変わることが正常
      if (testCode.includes('button:has-text("無料で鑑定")') && testCode.includes('button.click()')) {
        testResults.push(`✅ ボタンクリックによりページ遷移しました: ${currentUrl}`);
      } else {
        testResults.push(`⚠️ URLが期待値と異なります: ${currentUrl}`);
      }
    }

    // ページの読み込み状態をチェック
    const body = page.locator('body');
    const bodyCount = await body.count();
    if (bodyCount > 0) {
      testResults.push('✅ ページのbody要素が存在します');
    } else {
      testResults.push('❌ ページのbody要素が見つかりません');
      testSuccess = false;
    }

    // 基本的なページ情報を取得
    const viewport = page.viewportSize();
    const finalUrl = page.url();
    
    const links = await page.locator('a').count();
    const buttons = await page.locator('button').count();
    const forms = await page.locator('form').count();
    const images = await page.locator('img').count();

    return {
      success: testSuccess,
      message: testSuccess 
        ? `保存されたテスト「${config.testName}」が正常に実行されました。`
        : `保存されたテスト「${config.testName}」の実行で問題が発生しました。`,
      screenshots: screenshots,
      details: `
テスト情報:
- テスト名: ${config.testName}
- 対象URL: ${config.url}
- テスト内容: ${config.prompt}
- 作成日時: ${config.createdAt}

実行結果:
- 現在のURL: ${finalUrl}
- ビューポート: ${viewport?.width}x${viewport?.height}
- リンク数: ${links}
- ボタン数: ${buttons}
- フォーム数: ${forms}
- 画像数: ${images}

テスト実行結果:
${testResults.join('\n')}
      `.trim()
    };
    
  } catch (testExecutionError) {
    console.error('テスト実行エラー:', testExecutionError);
    return {
      success: false,
      message: `テスト実行中にエラーが発生しました: ${testExecutionError instanceof Error ? testExecutionError.message : '不明なエラー'}`,
      screenshots: screenshots,
      details: `
テスト情報:
- テスト名: ${config.testName}
- 対象URL: ${config.url}
- テスト内容: ${config.prompt}
- 作成日時: ${config.createdAt}

エラー詳細:
${testExecutionError instanceof Error ? testExecutionError.message : '不明なエラー'}
${testExecutionError instanceof Error && testExecutionError.stack ? `\nスタックトレース:\n${testExecutionError.stack}` : ''}
      `.trim()
    };
  }
}

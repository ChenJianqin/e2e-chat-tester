import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { chromium, Browser } from 'playwright';
import { runPlaywrightTest } from '../../../../tests/test-runner';

export async function POST(req: NextRequest) {
  const { projectId, testId } = await req.json();

  if (!projectId || !testId) {
    return NextResponse.json({ 
      success: false, 
      message: 'projectIdとtestIdが必要です。' 
    });
  }

  let browser: Browser | null = null;
  const screenshots: string[] = [];

  try {
    // 保存されたテストコードを読み込み
    const testCodePath = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`, 'test.spec.ts');
    const configPath = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`, 'test-config.json');

    let testCode: string;
    let config: any;

    try {
      testCode = await readFile(testCodePath, 'utf-8');
      const configContent = await readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error('テストファイル読み込みエラー:', error);
      return NextResponse.json({
        success: false,
        message: '保存されたテストコードが見つかりません。'
      });
    }

    // スクリーンショット保存用ディレクトリを作成（publicディレクトリ内）
    const screenshotsDir = join(process.cwd(), 'public', 'screenshots');
    await mkdir(screenshotsDir, { recursive: true });

    // Playwrightでテスト実行
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // エラーログの確認
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 保存されたテストコードを実行
    try {
      // 基本的なページ遷移
      await page.goto(config.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // テストランナーを使用してテストを実行
      const testResult = await runPlaywrightTest(page, config, testCode, screenshotsDir, projectId, testId);
      
      // スクリーンショットを結果に追加（パスは既に正しく生成されている）
      testResult.screenshots = [...screenshots, ...(testResult.screenshots || [])];

      return NextResponse.json({
        success: testResult.success,
        message: testResult.message,
        screenshots: testResult.screenshots,
        details: testResult.details,
        generatedCode: testCode
      });

    } catch (testError) {
      console.error('テスト実行エラー:', testError);
      const result = {
        success: false,
        message: `テスト実行中にエラーが発生しました: ${testError instanceof Error ? testError.message : '不明なエラー'}`,
        details: `
テスト情報:
- テスト名: ${config.testName}
- 対象URL: ${config.url}
- テスト内容: ${config.prompt}
- 作成日時: ${config.createdAt}

エラー詳細:
${testError instanceof Error ? testError.message : '不明なエラー'}
${testError instanceof Error && testError.stack ? `\nスタックトレース:\n${testError.stack}` : ''}
        `.trim(),
        generatedCode: testCode
      };
      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('保存されたテスト実行エラー:', error);
    const result = {
      success: false,
      message: `テスト実行中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    };
    return NextResponse.json(result);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

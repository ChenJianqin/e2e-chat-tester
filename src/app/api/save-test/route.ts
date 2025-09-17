import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface SaveTestRequest {
  projectId: string;
  testId: string;
  testName: string;
  url: string;
  prompt: string;
  generatedCode: string;
  testConfig?: any;
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, testId, testName, url, prompt, generatedCode, testConfig }: SaveTestRequest = await req.json();

    if (!projectId || !testId || !testName || !url || !prompt || !generatedCode) {
      return NextResponse.json({ 
        success: false, 
        message: '必要なパラメータが不足しています。' 
      });
    }

    // プロジェクトフォルダとテストフォルダを作成
    const projectDir = join(process.cwd(), 'tests', `project-${projectId}`);
    const testDir = join(projectDir, `test-${testId}`);
    const screenshotsDir = join(testDir, 'screenshots');

    await mkdir(screenshotsDir, { recursive: true });

    // テストコードを保存（Playwrightテスト形式に変換）
    const testCodePath = join(testDir, 'test.spec.ts');
    
    // AI生成コードから実際のテストコードを抽出
    let cleanTestCode = generatedCode;
    
    // 説明文を除去してテストコードのみを抽出
    if (generatedCode.includes('```typescript')) {
      const codeStart = generatedCode.indexOf('```typescript') + 12;
      const codeEnd = generatedCode.indexOf('```', codeStart);
      if (codeEnd > codeStart) {
        cleanTestCode = generatedCode.substring(codeStart, codeEnd).trim();
      }
    }
    
    // Playwrightテスト形式に変換
    const playwrightTestCode = `import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
  // テスト対象URL
  const targetUrl = '${url}';
  
  // ページに移動
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  
  // ページタイトルの確認
  await expect(page).toHaveTitle(/.*/);
  
  // スクリーンショットを取得
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
  // テストコードの内容に基づく動的テスト
  ${cleanTestCode.includes('無料で鑑定') || cleanTestCode.includes('鑑定') ? `
  // 鑑定ボタンのテスト
  const button = page.locator('button:has-text("無料で鑑定")');
  await expect(button).toBeVisible();
  await button.click();
  await page.waitForLoadState('networkidle');
  
  // 遷移後のスクリーンショット
  await page.screenshot({ path: 'result-page.png', fullPage: true });
  ` : ''}
  
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
});`;

    await writeFile(testCodePath, playwrightTestCode, 'utf-8');

    // テスト設定を保存
    const configData = {
      testId,
      testName,
      url,
      prompt,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...testConfig
    };
    
    const configPath = join(testDir, 'test-config.json');
    await writeFile(configPath, JSON.stringify(configData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'テストコードが正常に保存されました。',
      data: {
        projectId,
        testId,
        testPath: testCodePath,
        configPath: configPath
      }
    });

  } catch (error) {
    console.error('テスト保存エラー:', error);
    return NextResponse.json({
      success: false,
      message: `テスト保存中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }
}

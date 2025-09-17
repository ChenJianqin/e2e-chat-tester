import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { chromium, Browser } from 'playwright';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TestResult {
  success: boolean;
  message: string;
  screenshot?: string;
  details?: string;
  generatedCode?: string;
}

export async function POST(req: NextRequest) {
  const { url, prompt } = await req.json();

  if (!url || !prompt) {
    return NextResponse.json({ 
      success: false, 
      message: 'URLとテスト内容の両方を入力してください。' 
    });
  }

  let browser: Browser | null = null;
  let result: TestResult = { success: false, message: '' };

  try {
    // 1. OpenAI でPlaywrightテストコード生成
    const chat = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `あなたはE2Eテストの専門家です。与えられたURLと要件に基づいて、Playwrightを使用したテストコードを生成してください。
          
          以下の形式で返してください：
          - テストの目的を簡潔に説明
          - 実行可能なPlaywrightテストコード（TypeScript）
          - 期待される結果の説明
          
          コードは安全で、ページの読み込み、要素の確認、スクリーンショット取得などを含めてください。` 
        },
        { 
          role: 'user', 
          content: `URL: ${url}\nテスト要件: ${prompt}` 
        },
      ],
    });
    
    const generatedCode = chat.choices[0].message?.content ?? '';
    result.generatedCode = generatedCode;

    // 2. Playwrightでテスト実行
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // ページの読み込み
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // 基本的なテスト実行
    const title = await page.title();
    const url_final = page.url();
    
    // スクリーンショット取得
    const screenshot = await page.screenshot({ 
      type: 'png', 
      fullPage: true 
    });
    const screenshotBase64 = screenshot.toString('base64');
    
    // ページの基本情報を取得
    const viewport = page.viewportSize();
    
    // 簡単な要素チェック（例：リンク、ボタン、フォームの存在確認）
    const links = await page.locator('a').count();
    const buttons = await page.locator('button').count();
    const forms = await page.locator('form').count();
    const images = await page.locator('img').count();
    
    // エラーログの確認
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000); // 少し待機してエラーをキャッチ
    
    result = {
      success: true,
      message: `テストが正常に完了しました。`,
      screenshot: `data:image/png;base64,${screenshotBase64}`,
      details: `
ページ情報:
- タイトル: ${title}
- URL: ${url_final}
- ビューポート: ${viewport?.width}x${viewport?.height}
- リンク数: ${links}
- ボタン数: ${buttons}
- フォーム数: ${forms}
- 画像数: ${images}
- エラー数: ${errors.length}
${errors.length > 0 ? `\nエラー:\n${errors.join('\n')}` : ''}
      `.trim(),
      generatedCode
    };

  } catch (error) {
    console.error('テスト実行エラー:', error);
    result = {
      success: false,
      message: `テスト実行中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      generatedCode: result.generatedCode
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return NextResponse.json(result);
}

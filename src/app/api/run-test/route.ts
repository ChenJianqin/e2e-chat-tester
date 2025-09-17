import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { chromium, Browser, Page } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TestResult {
  success: boolean;
  message: string;
  screenshots?: string[];
  details?: string;
  generatedCode?: string;
}

interface PageScreenshot {
  url: string;
  title: string;
  screenshotPath: string;
  timestamp: string;
}

// 複数ページテスト実行関数
async function performMultiPageTest(
  page: Page, 
  initialUrl: string, 
  prompt: string, 
  screenshotsDir: string, 
  screenshots: string[], 
  pageScreenshots: PageScreenshot[]
) {
  const visitedUrls = new Set<string>();
  const maxPages = 5; // 最大ページ数制限
  let pageCount = 0;

  try {
    // 最初のページに移動
    console.log(`ページ ${pageCount + 1} を処理中: ${initialUrl}`);
    await page.goto(initialUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // ページの読み込み待機

    while (pageCount < maxPages) {
      pageCount++;
      const currentUrl = page.url();
      
      // 同じURLを既に訪問済みの場合は終了
      if (visitedUrls.has(currentUrl)) {
        console.log(`既に訪問済みのURL: ${currentUrl}`);
        break;
      }
      visitedUrls.add(currentUrl);

      try {
        // ページ情報を取得
        const title = await page.title();
        console.log(`ページ ${pageCount} - タイトル: ${title}`);
        console.log(`ページ ${pageCount} - URL: ${currentUrl}`);

        // スクリーンショットを取得
        const screenshot = await page.screenshot({ 
          type: 'png', 
          fullPage: true 
        });

        // ファイル名を生成
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}-page${pageCount}.png`;
        const filepath = join(screenshotsDir, filename);

        // スクリーンショットをファイルに保存
        await writeFile(filepath, screenshot);
        console.log(`スクリーンショット保存: ${filename}`);

        // パスを相対パスに変換
        const relativePath = `/screenshots/${filename}`;
        screenshots.push(relativePath);
        pageScreenshots.push({
          url: currentUrl,
          title: title,
          screenshotPath: relativePath,
          timestamp: new Date().toISOString()
        });

        // 最後のページの場合は終了
        if (pageCount >= maxPages) {
          console.log('最大ページ数に達したため終了');
          break;
        }

        // 次のページに遷移を試行
        console.log('次のページへの遷移を試行中...');
        const navigationSuccess = await performNavigation(page, prompt);
        
        if (!navigationSuccess) {
          console.log('次のページへの遷移に失敗したため終了');
          break;
        }

        // ページ遷移後のURLを確認
        const newUrl = page.url();
        console.log(`遷移後のURL: ${newUrl}`);
        
        // URLが変わっていない場合は終了
        if (newUrl === currentUrl) {
          console.log('URLが変わらなかったため終了');
          break;
        }

        // 次のページの読み込みを待機
        await page.waitForTimeout(3000);

      } catch (error) {
        console.error(`ページ ${pageCount} の処理でエラー:`, error);
        break;
      }
    }
    
    console.log(`合計 ${pageCount} ページのテストを完了`);
  } catch (error) {
    console.error('複数ページテスト実行でエラー:', error);
  }
}

// リンクを評価する関数
function evaluateLink(href: string, text: string, prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const lowerText = text.toLowerCase();
  
  if (lowerPrompt.includes('ログイン') && lowerText.includes('ログイン')) return true;
  if (lowerPrompt.includes('商品') && (lowerText.includes('商品') || lowerText.includes('一覧'))) return true;
  if (lowerPrompt.includes('詳細') && lowerText.includes('詳細')) return true;
  if (lowerPrompt.includes('鑑定') && lowerText.includes('鑑定')) return true;
  if (lowerPrompt.includes('占い') && lowerText.includes('占い')) return true;
  if (lowerPrompt.includes('無料') && lowerText.includes('無料')) return true;
  
  return false;
}

// ボタンを評価する関数
function evaluateButton(text: string, prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const lowerText = text.toLowerCase();
  
  if (lowerPrompt.includes('鑑定') && lowerText.includes('鑑定')) return true;
  if (lowerPrompt.includes('占い') && lowerText.includes('占い')) return true;
  if (lowerPrompt.includes('無料') && lowerText.includes('無料')) return true;
  if (lowerPrompt.includes('クリック') && lowerText.includes('クリック')) return true;
  if (lowerPrompt.includes('ボタン') && lowerText.includes('ボタン')) return true;
  
  return false;
}

// URLを正規化する関数
function normalizeUrl(href: string, baseUrl: string): string {
  return href.startsWith('http') ? href : new URL(href, baseUrl).href;
}

// ボタンをクリックしてページ遷移を試行する関数
async function clickButtonAndNavigate(page: Page, prompt: string): Promise<boolean> {
  try {
    // 様々なボタン要素を検索
    const buttonSelectors = [
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      '.btn',
      '.button'
    ];
    
    for (const selector of buttonSelectors) {
      const elements = await page.locator(selector).all();
      
      for (const element of elements) {
        const text = await element.textContent();
        const value = await element.getAttribute('value');
        const ariaLabel = await element.getAttribute('aria-label');
        
        const displayText = text || value || ariaLabel || '';
        
        if (displayText && evaluateButton(displayText, prompt)) {
          console.log(`ボタンをクリック: ${displayText} (${selector})`);
          await element.click();
          await page.waitForTimeout(3000); // ページ遷移を待機
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('ボタンクリックでエラー:', error);
    return false;
  }
}

// ボタンクリックまたはリンククリックを実行する関数
async function performNavigation(page: Page, prompt: string): Promise<boolean> {
  try {
    // まずボタンクリックを試行
    const buttonClicked = await clickButtonAndNavigate(page, prompt);
    if (buttonClicked) {
      console.log('ボタンクリックが成功しました');
      return true;
    }
    
    // ボタンクリックが失敗した場合、リンクを検索してクリック
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      if (href && text && evaluateLink(href, text, prompt)) {
        console.log(`リンクをクリック: ${text} -> ${href}`);
        await link.click();
        await page.waitForTimeout(3000); // ページ遷移を待機
        return true;
      }
    }
    
    // デフォルトで最初のリンクをクリック
    if (links.length > 0) {
      const firstLink = links[0];
      const href = await firstLink.getAttribute('href');
      if (href) {
        console.log(`デフォルトリンクをクリック: ${href}`);
        await firstLink.click();
        await page.waitForTimeout(3000); // ページ遷移を待機
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('ナビゲーションでエラー:', error);
    return false;
  }
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
  const screenshots: string[] = [];
  const pageScreenshots: PageScreenshot[] = [];

  try {
    // スクリーンショット保存用ディレクトリを作成
    const screenshotsDir = join(process.cwd(), 'public', 'screenshots');
    await mkdir(screenshotsDir, { recursive: true });
    // 1. OpenAI でPlaywrightテストコード生成（複数ページ対応）
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
          
          コードは安全で、ページの読み込み、要素の確認、スクリーンショット取得などを含めてください。
          複数ページをテストする場合は、各ページでスクリーンショットを取得し、ページ遷移も含めてください。` 
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
    
    // エラーログの確認
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 複数ページ対応のテスト実行
    await performMultiPageTest(page, url, prompt, screenshotsDir, screenshots, pageScreenshots);
    
    // 基本的なページ情報を取得（最後のページ）
    const title = await page.title();
    const url_final = page.url();
    const viewport = page.viewportSize();
    
    // 簡単な要素チェック（例：リンク、ボタン、フォームの存在確認）
    const links = await page.locator('a').count();
    const buttons = await page.locator('button').count();
    const forms = await page.locator('form').count();
    const images = await page.locator('img').count();
    
    await page.waitForTimeout(2000); // 少し待機してエラーをキャッチ
    
    result = {
      success: true,
      message: `テストが正常に完了しました。${pageScreenshots.length}ページのスクリーンショットを取得しました。`,
      screenshots: screenshots,
      details: `
ページ情報:
- 最終ページタイトル: ${title}
- 最終URL: ${url_final}
- ビューポート: ${viewport?.width}x${viewport?.height}
- リンク数: ${links}
- ボタン数: ${buttons}
- フォーム数: ${forms}
- 画像数: ${images}
- エラー数: ${errors.length}
- 取得ページ数: ${pageScreenshots.length}

取得したページ:
${pageScreenshots.map((page, index) => 
  `${index + 1}. ${page.title} (${page.url})`
).join('\n')}

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

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

interface TestConfig {
  testId: string;
  testName: string;
  url: string;
  prompt: string;
  createdAt: string;
  lastModified: string;
  [key: string]: any;
}

interface TestInfo {
  projectId: string;
  testId: string;
  testName: string;
  url: string;
  prompt: string;
  createdAt: string;
  lastModified: string;
  hasTestCode: boolean;
  hasConfig: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const testsDir = join(process.cwd(), 'tests');
    const tests: TestInfo[] = [];

    if (projectId) {
      // 特定のプロジェクトのテストのみ取得
      const projectDir = join(testsDir, `project-${projectId}`);
      try {
        const testDirs = await readdir(projectDir);
        for (const testDir of testDirs) {
          if (testDir.startsWith('test-')) {
            const testInfo = await loadTestInfo(projectId, testDir, projectDir);
            if (testInfo) {
              tests.push(testInfo);
            }
          }
        }
      } catch (error) {
        // プロジェクトフォルダが存在しない場合は空の配列を返す
        console.log(`プロジェクト ${projectId} のフォルダが見つかりません:`, error);
      }
    } else {
      // 全てのプロジェクトのテストを取得
      try {
        const projectDirs = await readdir(testsDir);
        for (const projectDir of projectDirs) {
          if (projectDir.startsWith('project-')) {
            const projectId = projectDir.replace('project-', '');
            const fullProjectDir = join(testsDir, projectDir);
            const testDirs = await readdir(fullProjectDir);
            
            for (const testDir of testDirs) {
              if (testDir.startsWith('test-')) {
                const testInfo = await loadTestInfo(projectId, testDir, fullProjectDir);
                if (testInfo) {
                  tests.push(testInfo);
                }
              }
            }
          }
        }
      } catch (error) {
        console.log('テストフォルダが見つかりません:', error);
      }
    }

    // 作成日時でソート（新しい順）
    tests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: tests
    });

  } catch (error) {
    console.error('テスト読み込みエラー:', error);
    return NextResponse.json({
      success: false,
      message: `テスト読み込み中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }
}

async function loadTestInfo(projectId: string, testDir: string, projectDir: string): Promise<TestInfo | null> {
  try {
    const fullTestDir = join(projectDir, testDir);
    const testId = testDir.replace('test-', '');
    
    // 設定ファイルを読み込み
    const configPath = join(fullTestDir, 'test-config.json');
    let config: TestConfig;
    
    try {
      const configContent = await readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // 設定ファイルが存在しない場合は基本情報のみ
      config = {
        testId,
        testName: `テスト ${testId}`,
        url: '',
        prompt: '',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    }

    // テストコードファイルの存在確認
    const testCodePath = join(fullTestDir, 'test.spec.ts');
    let hasTestCode = false;
    try {
      await stat(testCodePath);
      hasTestCode = true;
    } catch {
      hasTestCode = false;
    }

    return {
      projectId,
      testId,
      testName: config.testName,
      url: config.url,
      prompt: config.prompt,
      createdAt: config.createdAt,
      lastModified: config.lastModified,
      hasTestCode,
      hasConfig: true
    };

  } catch (error) {
    console.error(`テスト情報読み込みエラー (${testDir}):`, error);
    return null;
  }
}

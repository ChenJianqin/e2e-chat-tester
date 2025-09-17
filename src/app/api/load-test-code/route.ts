import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const testId = searchParams.get('testId');

    if (!projectId || !testId) {
      return NextResponse.json({
        success: false,
        message: 'projectIdとtestIdが必要です。'
      });
    }

    const testCodePath = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`, 'test.spec.ts');
    const configPath = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`, 'test-config.json');

    try {
      // テストコードを読み込み
      const testCode = await readFile(testCodePath, 'utf-8');
      
      // 設定ファイルを読み込み
      let config = null;
      try {
        const configContent = await readFile(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch {
        // 設定ファイルが存在しない場合は無視
      }

      return NextResponse.json({
        success: true,
        data: {
          testCode,
          config
        }
      });

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          message: '指定されたテストが見つかりません。'
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('テストコード読み込みエラー:', error);
    return NextResponse.json({
      success: false,
      message: `テストコード読み込み中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }
}

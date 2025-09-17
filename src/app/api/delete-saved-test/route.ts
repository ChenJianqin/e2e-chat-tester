import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import { join } from 'path';

export async function DELETE(req: NextRequest) {
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

    const testDir = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`);

    try {
      // テストディレクトリ全体を削除
      await rm(testDir, { recursive: true, force: true });
      
      return NextResponse.json({
        success: true,
        message: 'テストが正常に削除されました。'
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
    console.error('テスト削除エラー:', error);
    return NextResponse.json({
      success: false,
      message: `テスト削除中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }
}

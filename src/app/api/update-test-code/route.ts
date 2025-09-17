import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface UpdateTestCodeRequest {
  projectId: string;
  testId: string;
  testCode: string;
}

export async function PUT(req: NextRequest) {
  try {
    const { projectId, testId, testCode }: UpdateTestCodeRequest = await req.json();

    if (!projectId || !testId || !testCode) {
      return NextResponse.json({
        success: false,
        message: 'projectId、testId、testCodeが必要です。'
      });
    }

    const testCodePath = join(process.cwd(), 'tests', `project-${projectId}`, `test-${testId}`, 'test.spec.ts');

    try {
      // テストコードを更新
      await writeFile(testCodePath, testCode, 'utf-8');

      return NextResponse.json({
        success: true,
        message: 'テストコードが正常に更新されました。'
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
    console.error('テストコード更新エラー:', error);
    return NextResponse.json({
      success: false,
      message: `テストコード更新中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
  }
}

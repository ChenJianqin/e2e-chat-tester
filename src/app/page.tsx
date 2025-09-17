'use client';
import { useState } from 'react';

interface TestResult {
  success: boolean;
  message: string;
  screenshot?: string;
  details?: string;
  generatedCode?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    if (!url || !prompt) {
      alert('URLとテスト内容の両方を入力してください。');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🤖 対話型E2Eテストツール
            </h1>
            <p className="text-gray-600 text-lg">
              URLとテスト内容を入力するだけで、AIが自動でE2Eテストを実行します
            </p>
          </div>

          {/* メインフォーム */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="space-y-6">
              {/* URL入力 */}
              <div>
                <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
                  🌐 テスト対象URL
                </label>
                <input
                  id="url-input"
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              {/* テスト内容入力 */}
              <div>
                <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700 mb-2">
                  📝 テスト内容（日本語で記述）
                </label>
                <textarea
                  id="prompt-input"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  rows={4}
                  placeholder="例：トップページでヘッダーが正しく表示されているか確認、ログインボタンがクリックできるかテスト、フォームのバリデーションが正常に動作するか確認"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* 実行ボタン */}
              <button
                onClick={runTest}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    テスト実行中...
                  </span>
                ) : (
                  '🚀 テストを実行'
                )}
              </button>
            </div>
          </div>

          {/* 結果表示 */}
          {result && (
            <div className="space-y-6">
              {/* テスト結果サマリー */}
              <div className={`p-6 rounded-xl shadow-lg ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-4">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {result.success ? '✅ テスト完了' : '❌ テスト失敗'}
                  </h3>
                </div>
                <p className="text-gray-700">{result.message}</p>
              </div>

              {/* スクリーンショット */}
              {result.screenshot && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📸 スクリーンショット</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={result.screenshot} 
                      alt="テスト結果スクリーンショット" 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* 詳細情報 */}
              {result.details && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 詳細情報</h3>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {result.details}
                  </pre>
                </div>
              )}

              {/* 生成されたコード */}
              {result.generatedCode && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">💻 生成されたテストコード</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    {result.generatedCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

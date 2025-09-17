'use client';
import { useState, useEffect } from 'react';

interface TestResult {
  success: boolean;
  message: string;
  screenshots?: string[];
  details?: string;
  generatedCode?: string;
}

interface TestCase {
  id: string;
  name: string;
  url: string;
  prompt: string;
  createdAt: string;
  lastExecuted?: string;
  result?: TestResult;
  projectId?: string;
  testId?: string;
  hasTestCode?: boolean;
}

interface SavedTest {
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

// プロジェクト別テスト表示コンポーネント
function ProjectTestsDisplay({ 
  savedTests, 
  loadSavedTest, 
  runSavedTest,
  deleteSavedTest,
  editTestCode,
  selectedProject,
  setSelectedProject,
  showProjectForm,
  setShowProjectForm,
  newProjectName,
  setNewProjectName,
  createProject
}: Readonly<{ 
  savedTests: SavedTest[]; 
  loadSavedTest: (savedTest: SavedTest) => void; 
  runSavedTest: (savedTest: SavedTest) => void;
  deleteSavedTest: (savedTest: SavedTest) => void;
  editTestCode: (savedTest: SavedTest) => void;
  selectedProject: string;
  setSelectedProject: (project: string) => void;
  showProjectForm: boolean;
  setShowProjectForm: (show: boolean) => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  createProject: () => void;
}>) {
  const projects = [...new Set(savedTests.map(test => test.projectId))].sort((a, b) => a.localeCompare(b));
  const selectedProjectTests = selectedProject ? savedTests.filter(test => test.projectId === selectedProject) : [];

  if (savedTests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">まだ保存されたテストがありません。</p>
        <p className="text-sm">テストを実行後、「テストコードを保存」ボタンから保存してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* プロジェクト選択 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📁 プロジェクト選択</h3>
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            + 新規プロジェクト
          </button>
        </div>

        {showProjectForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="プロジェクト名を入力"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <button
                onClick={createProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                作成
              </button>
              <button
                onClick={() => setShowProjectForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProject('')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedProject === '' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全てのプロジェクト ({savedTests.length})
          </button>
          {projects.map((project) => {
            const projectTests = savedTests.filter(test => test.projectId === project);
            return (
              <button
                key={project}
                onClick={() => setSelectedProject(project)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedProject === project 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {project} ({projectTests.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択されたプロジェクトのテスト一覧 */}
      {(() => {
        if (selectedProject && selectedProjectTests.length === 0) {
          return (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">このプロジェクトにはテストがありません。</p>
              <p className="text-sm">「テストコードを保存」ボタンからテストを保存してください。</p>
            </div>
          );
        }
        
        if (selectedProjectTests.length > 0) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                📋 {selectedProject} のテスト ({selectedProjectTests.length}件)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProjectTests.map((savedTest) => (
                  <div key={`${savedTest.projectId}-${savedTest.testId}`} className="border rounded-lg p-4 transition-all border-gray-200 hover:border-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">{savedTest.testName}</h4>
                        <p className="text-sm text-gray-600 mb-1 truncate"><strong>URL:</strong> {savedTest.url}</p>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2"><strong>テスト内容:</strong> {savedTest.prompt}</p>
                        <p className="text-xs text-gray-500">
                          作成: {new Date(savedTest.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <button
                            onClick={() => loadSavedTest(savedTest)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                          >
                            📝 読み込み
                          </button>
                          <button
                            onClick={() => runSavedTest(savedTest)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                          >
                            ▶️ 実行
                          </button>
                          <button
                            onClick={() => editTestCode(savedTest)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={() => deleteSavedTest(savedTest)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                          >
                            🗑️ 削除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedTests.map((savedTest) => (
              <div key={`${savedTest.projectId}-${savedTest.testId}`} className="border rounded-lg p-4 transition-all border-gray-200 hover:border-gray-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 mb-1">{savedTest.testName}</h4>
                    <p className="text-sm text-gray-600 mb-1 truncate"><strong>URL:</strong> {savedTest.url}</p>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2"><strong>テスト内容:</strong> {savedTest.prompt}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      <strong>プロジェクト:</strong> {savedTest.projectId}
                    </p>
                    <p className="text-xs text-gray-500">
                      作成: {new Date(savedTest.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button
                        onClick={() => loadSavedTest(savedTest)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        📝 読み込み
                      </button>
                      <button
                        onClick={() => runSavedTest(savedTest)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                      >
                        ▶️ 実行
                      </button>
                      <button
                        onClick={() => editTestCode(savedTest)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => deleteSavedTest(savedTest)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// テストケース表示コンポーネント
function TestCasesDisplay({ 
  testCases, 
  selectedTestCaseId, 
  selectTestCase, 
  deleteTestCase 
}: Readonly<{ 
  testCases: TestCase[]; 
  selectedTestCaseId: string; 
  selectTestCase: (testCaseId: string) => void; 
  deleteTestCase: (testCaseId: string) => void; 
}>) {
  if (testCases.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testCases.map((testCase) => (
          <div key={testCase.id} className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedTestCaseId === testCase.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <div className="flex items-start justify-between">
              <button 
                className="flex-1 cursor-pointer text-left"
                onClick={() => selectTestCase(testCase.id)}
                type="button"
              >
                <h3 className="font-medium text-gray-800 mb-1">{testCase.name}</h3>
                <p className="text-sm text-gray-600 mb-1 truncate"><strong>URL:</strong> {testCase.url}</p>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2"><strong>テスト内容:</strong> {testCase.prompt}</p>
                <p className="text-xs text-gray-500 mb-1">
                  <strong>プロジェクト:</strong> {testCase.projectId || 'default'}
                </p>
                <p className="text-xs text-gray-500">
                  作成: {new Date(testCase.createdAt).toLocaleDateString('ja-JP')}
                  {testCase.lastExecuted && (
                    <span className="ml-2">
                      実行: {new Date(testCase.lastExecuted).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </p>
                {testCase.result && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      testCase.result.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {testCase.result.success ? '✅ 成功' : '❌ 失敗'}
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={() => deleteTestCase(testCase.id)}
                className="ml-2 text-red-500 hover:text-red-700 text-sm"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-gray-500">
      <p className="mb-4">まだテストケースが保存されていません。</p>
      <p className="text-sm">「+ 新規テストケース」ボタンから最初のテストケースを作成してください。</p>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [testCaseName, setTestCaseName] = useState('');
  const [showTestCaseForm, setShowTestCaseForm] = useState(false);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [projectId, setProjectId] = useState('');
  const [showSavedTests, setShowSavedTests] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingTestCode, setEditingTestCode] = useState<{projectId: string, testId: string, testCode: string} | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  // ローカルストレージからテストケースを読み込み
  useEffect(() => {
    const savedTestCases = localStorage.getItem('testCases');
    if (savedTestCases) {
      setTestCases(JSON.parse(savedTestCases));
    }
    loadSavedTests();
  }, []);

  // 保存されたテストを読み込み
  const loadSavedTests = async () => {
    try {
      const res = await fetch('/api/load-tests');
      const data = await res.json();
      if (data.success) {
        setSavedTests(data.data);
      }
    } catch (error) {
      console.error('保存されたテストの読み込みエラー:', error);
    }
  };

  // プロジェクトを作成
  const createProject = () => {
    if (!newProjectName.trim()) {
      alert('プロジェクト名を入力してください。');
      return;
    }

    const projectId = newProjectName.trim().toLowerCase().replace(/\s+/g, '-');
    setCurrentProjectId(projectId);
    setProjectId(projectId);
    setNewProjectName('');
    setShowProjectForm(false);
    alert(`プロジェクト「${newProjectName}」を作成しました。`);
  };

  // テストケースをローカルストレージに保存
  const saveTestCases = (cases: TestCase[]) => {
    setTestCases(cases);
    localStorage.setItem('testCases', JSON.stringify(cases));
  };

  // テストケースを追加
  const addTestCase = () => {
    if (!url || !prompt || !testCaseName) {
      alert('テストケース名、URL、テスト内容の全てを入力してください。');
      return;
    }

    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: testCaseName,
      url,
      prompt,
      createdAt: new Date().toISOString(),
      projectId: currentProjectId || 'default',
    };

    const updatedCases = [...testCases, newTestCase];
    saveTestCases(updatedCases);
    setTestCaseName('');
    setCurrentProjectId('');
    setShowTestCaseForm(false);
  };

  // テストケースを選択
  const selectTestCase = (testCaseId: string) => {
    const testCase = testCases.find(tc => tc.id === testCaseId);
    if (testCase) {
      setSelectedTestCaseId(testCaseId);
      setUrl(testCase.url);
      setPrompt(testCase.prompt);
    }
  };

  // テストケースを削除
  const deleteTestCase = (testCaseId: string) => {
    const updatedCases = testCases.filter(tc => tc.id !== testCaseId);
    saveTestCases(updatedCases);
    if (selectedTestCaseId === testCaseId) {
      setSelectedTestCaseId('');
      setUrl('');
      setPrompt('');
    }
  };

  // テストコード保存フォームを表示してスクロール
  const showSaveFormAndScroll = () => {
    setShowSaveForm(true);
    // 少し遅延を入れてからスクロール（フォームが表示されるのを待つ）
    setTimeout(() => {
      const saveFormElement = document.getElementById('test-code-save-form');
      if (saveFormElement) {
        saveFormElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        // フォーム内の最初の入力フィールドにフォーカス
        const firstInput = saveFormElement.querySelector('input[type="text"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  };

  // テストコードを保存
  const saveTestCode = async () => {
    if (!url || !prompt || !testCaseName || !projectId) {
      alert('プロジェクトID、テストケース名、URL、テスト内容の全てを入力してください。');
      return;
    }

    if (!result?.generatedCode) {
      alert('保存するテストコードがありません。まずテストを実行してください。');
      return;
    }

    try {
      const testId = Date.now().toString();
      const res = await fetch('/api/save-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          testId,
          testName: testCaseName,
          url,
          prompt,
          generatedCode: result.generatedCode
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('テストコードが正常に保存されました。');
        setShowSaveForm(false);
        setProjectId('');
        setTestCaseName('');
        loadSavedTests();
      } else {
        alert(`保存エラー: ${data.message}`);
      }
    } catch (error) {
      alert(`保存エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 保存されたテストを読み込み
  const loadSavedTest = async (savedTest: SavedTest) => {
    try {
      const res = await fetch(`/api/load-test-code?projectId=${savedTest.projectId}&testId=${savedTest.testId}`);
      const data = await res.json();
      if (data.success) {
        setUrl(savedTest.url);
        setPrompt(savedTest.prompt);
        setTestCaseName(savedTest.testName);
        setProjectId(savedTest.projectId);
        setResult({
          success: true,
          message: '保存されたテストが読み込まれました。',
          generatedCode: data.data.testCode
        });
        setShowSavedTests(false);
      } else {
        alert(`読み込みエラー: ${data.message}`);
      }
    } catch (error) {
      alert(`読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 保存されたテストを実行
  const runSavedTest = async (savedTest: SavedTest) => {
    setLoading(true);
    setResult(null);

    // テスト実行中表示にスクロール
    setTimeout(() => {
      const testExecutionButton = document.getElementById('test-execution-button');
      if (testExecutionButton) {
        testExecutionButton.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);

    try {
      const res = await fetch('/api/run-saved-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: savedTest.projectId,
          testId: savedTest.testId
        }),
      });

      const data = await res.json();
      setResult(data);
      
      // テスト完了後、結果表示部分にスクロール
      setTimeout(() => {
        const testResults = document.getElementById('test-results');
        if (testResults) {
          testResults.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    } catch (error) {
      const errorResult = {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      };
      setResult(errorResult);
      
      // エラー時も結果表示部分にスクロール
      setTimeout(() => {
        const testResults = document.getElementById('test-results');
        if (testResults) {
          testResults.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // 保存されたテストを削除
  const deleteSavedTest = async (savedTest: SavedTest) => {
    if (!confirm(`「${savedTest.testName}」を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/delete-saved-test?projectId=${savedTest.projectId}&testId=${savedTest.testId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        alert('テストが正常に削除されました。');
        loadSavedTests(); // 一覧を更新
      } else {
        alert(`削除エラー: ${data.message}`);
      }
    } catch (error) {
      alert(`削除エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // テストコードを編集
  const editTestCode = async (savedTest: SavedTest) => {
    try {
      const res = await fetch(`/api/load-test-code?projectId=${savedTest.projectId}&testId=${savedTest.testId}`);
      const data = await res.json();
      if (data.success) {
        setEditingTestCode({
          projectId: savedTest.projectId,
          testId: savedTest.testId,
          testCode: data.data.testCode
        });
        setShowCodeEditor(true);
      } else {
        alert(`読み込みエラー: ${data.message}`);
      }
    } catch (error) {
      alert(`読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // テストコードを保存
  const saveEditedTestCode = async () => {
    if (!editingTestCode) return;

    try {
      const res = await fetch('/api/update-test-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTestCode),
      });

      const data = await res.json();
      if (data.success) {
        alert('テストコードが正常に更新されました。');
        setShowCodeEditor(false);
        setEditingTestCode(null);
      } else {
        alert(`更新エラー: ${data.message}`);
      }
    } catch (error) {
      alert(`更新エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

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
      
      // テストケースが選択されている場合、結果を保存
      if (selectedTestCaseId) {
        const updatedCases = testCases.map(tc => 
          tc.id === selectedTestCaseId 
            ? { 
                ...tc, 
                lastExecuted: new Date().toISOString(),
                result: data
              }
            : tc
        );
        saveTestCases(updatedCases);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      };
      setResult(errorResult);
      
      // エラーもテストケースに保存
      if (selectedTestCaseId) {
        const updatedCases = testCases.map(tc => 
          tc.id === selectedTestCaseId 
            ? { 
                ...tc, 
                lastExecuted: new Date().toISOString(),
                result: errorResult
              }
            : tc
        );
        saveTestCases(updatedCases);
      }
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

          {/* テストケース管理セクション */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                📋 {testCases.length > 0 ? '保存されたテストケース' : 'テストケース管理'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSavedTests(!showSavedTests)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showSavedTests ? 'テストケースに戻る' : '💾 保存されたテスト'}
                </button>
                <button
                  onClick={() => setShowTestCaseForm(!showTestCaseForm)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {showTestCaseForm ? 'キャンセル' : '+ 新規テストケース'}
                </button>
              </div>
            </div>
            
            {showSavedTests ? (
              <ProjectTestsDisplay 
                savedTests={savedTests}
                loadSavedTest={loadSavedTest}
                runSavedTest={runSavedTest}
                deleteSavedTest={deleteSavedTest}
                editTestCode={editTestCode}
                selectedProject={selectedProject}
                setSelectedProject={setSelectedProject}
                showProjectForm={showProjectForm}
                setShowProjectForm={setShowProjectForm}
                newProjectName={newProjectName}
                setNewProjectName={setNewProjectName}
                createProject={createProject}
              />
            ) : (
              <TestCasesDisplay 
                testCases={testCases}
                selectedTestCaseId={selectedTestCaseId}
                selectTestCase={selectTestCase}
                deleteTestCase={deleteTestCase}
              />
            )}
          </div>

          {/* 新規テストケース作成フォーム */}
          {showTestCaseForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📝 新規テストケース作成</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="project-id-testcase" className="block text-sm font-medium text-gray-700 mb-2">
                    プロジェクトID
                  </label>
                  <input
                    id="project-id-testcase"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: my-project (空の場合は 'default' になります)"
                    value={currentProjectId}
                    onChange={(e) => setCurrentProjectId(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="test-case-name" className="block text-sm font-medium text-gray-700 mb-2">
                    テストケース名
                  </label>
                  <input
                    id="test-case-name"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: ログインテスト"
                    value={testCaseName}
                    onChange={(e) => setTestCaseName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTestCase}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    テストケースを保存
                  </button>
                  <button
                    onClick={() => setShowTestCaseForm(false)}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* テストコード保存フォーム */}
          {showSaveForm && (
            <div id="test-code-save-form" className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">💾 テストコード保存</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-blue-800 mb-2">📋 保存するテスト情報</h3>
                  <p className="text-sm text-blue-600 mb-1"><strong>URL:</strong> {url}</p>
                  <p className="text-sm text-blue-600"><strong>テスト内容:</strong> {prompt}</p>
                </div>
                <div>
                  <label htmlFor="project-id" className="block text-sm font-medium text-gray-700 mb-2">
                    プロジェクトID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="project-id"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: my-project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="test-case-name-save" className="block text-sm font-medium text-gray-700 mb-2">
                    テストケース名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="test-case-name-save"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: ログインテスト"
                    value={testCaseName}
                    onChange={(e) => setTestCaseName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveTestCode}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    💾 テストコードを保存
                  </button>
                  <button
                    onClick={() => setShowSaveForm(false)}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* メインフォーム */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="space-y-6">
              {/* URL入力 */}
              <div>
                <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
                  🌐 テスト対象URL
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTestCaseId}
                    onChange={(e) => selectTestCase(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">新しいURLを入力</option>
                    {testCases.map((testCase) => (
                      <option key={testCase.id} value={testCase.id}>
                        {testCase.name} - {testCase.url}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  id="url-input"
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 mt-2"
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

              {/* 選択されたテストケース情報 */}
              {selectedTestCaseId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">
                    📌 選択中のテストケース: {testCases.find(tc => tc.id === selectedTestCaseId)?.name}
                  </h3>
                  <p className="text-sm text-blue-600">
                    このテストケースを再実行します。URLやテスト内容を変更してから実行することも可能です。
                  </p>
                </div>
              )}

              {/* 実行ボタン */}
              <button
                id="test-execution-button"
                onClick={runTest}
                disabled={loading || (!url || !prompt)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
{(() => {
                  if (loading) {
                    return (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        テスト実行中...
                      </span>
                    );
                  }
                  return selectedTestCaseId ? '🔄 テストケースを再実行' : '🚀 テストを実行';
                })()}
              </button>
            </div>
          </div>

          {/* 結果表示 */}
          {result && (
            <div id="test-results" className="space-y-6">
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
              {result.screenshots && result.screenshots.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📸 スクリーンショット ({result.screenshots.length}ページ)
                  </h3>
                  <div className="space-y-6">
                    {result.screenshots.map((screenshot, index) => (
                      <div key={`screenshot-${index}-${screenshot}`} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <h4 className="font-medium text-gray-700">
                            ページ {index + 1}
                          </h4>
                        </div>
                        <div className="p-4">
                          <img 
                            src={screenshot} 
                            alt={`テスト結果スクリーンショット - ページ ${index + 1}`} 
                            className="w-full h-auto rounded-lg shadow-sm"
                          />
                        </div>
                      </div>
                    ))}
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">💻 生成されたテストコード</h3>
                    <button
                      onClick={showSaveFormAndScroll}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      💾 テストコードを保存
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    {result.generatedCode}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* テストコード編集モーダル */}
          {showCodeEditor && editingTestCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800">✏️ テストコード編集</h3>
                  <button
                    onClick={() => {
                      setShowCodeEditor(false);
                      setEditingTestCode(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 overflow-auto max-h-[70vh]">
                  <textarea
                    value={editingTestCode.testCode}
                    onChange={(e) => setEditingTestCode({
                      ...editingTestCode,
                      testCode: e.target.value
                    })}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="テストコードを編集してください..."
                  />
                </div>
                <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowCodeEditor(false);
                      setEditingTestCode(null);
                    }}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveEditedTestCode}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    💾 保存
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

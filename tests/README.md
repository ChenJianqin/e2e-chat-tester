# E2Eテストコード保存フォルダ

このフォルダには、生成されたE2Eテストコードがプロジェクト別に保存されます。

## フォルダ構造

```
tests/
├── project-{projectId}/
│   ├── test-{testId}/
│   │   ├── test.spec.ts          # 生成されたテストコード
│   │   ├── test-config.json      # テスト設定情報
│   │   └── screenshots/          # テスト実行時のスクリーンショット
│   └── ...
└── ...
```

## ファイル説明

- `test.spec.ts`: Playwrightで実行可能なテストコード
- `test-config.json`: テストの設定情報（URL、プロンプト、作成日時など）
- `screenshots/`: テスト実行時に取得されたスクリーンショット

# 机上レイアウトシミュレータ

机と物の配置を上面・正面・側面の三面図で編集する TypeScript / React アプリです。机の幅・奥行き・高さを変更できます。レイアウト名を付けて `.layout.json` ファイルで保存・読み込みでき、対応ブラウザでは保存先を選択できます。

## 起動

プロジェクトのルートは `D:\develop\desk-plan-simulator` です。VS Code では `desk-plan-simulator.code-workspace` を開いてください。Codex にプロジェクトとして追加する場合も、このフォルダーを選択してください。

Node.js 22.13 以上で、プロジェクトのルートから `npm ci`、`npm run dev` を実行してください。既に依存関係がある場合は `npm run dev` だけで起動できます。

## ファイル構成

- `app/simulator.tsx`: 操作画面と三面図
- `app/globals.css`: 画面のスタイル
- `lib/desk-model.ts`: 座標、寸法、重なり判定
- `lib/size-presets.ts`: 用紙・モニター・ノートPCのサイズ辞書
- `lib/layout-file.ts`: `.layout.json` の保存と読み込み
- `public/`: アイコンとリンクカード画像（SVG原稿とPNG）
- `src/main.tsx`: アプリの起動処理

## ビルドと公開

`npm run build` で静的ファイルを `dist/` に作成します。`main` ブランチへ変更をプッシュすると、GitHub と連携した Cloudflare Pages が自動でビルド・公開します。

公開先: https://desk-plan-simulator-git.pages.dev/

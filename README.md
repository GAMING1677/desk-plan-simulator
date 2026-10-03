# 机上レイアウトシミュレータ

机と物の配置を上面・正面・側面の三面図で編集する TypeScript / React アプリです。机の幅・奥行き・高さを変更できます。レイアウト名を付けて `.layout.json` ファイルで保存・読み込みでき、対応ブラウザでは保存先を選択できます。

## 起動

プロジェクトのルートは `D:\develop\desk-plan-simulator` です。VS Code では `desk-plan-simulator.code-workspace` を開いてください。Codex にプロジェクトとして追加する場合も、このフォルダーを選択してください。

Node.js 22.13 以上で、プロジェクトのルートから `npm ci`、`npm run dev` を実行してください。既に依存関係がある場合は `npm run dev` だけで起動できます。

## ファイル構成

- `app/simulator.tsx`: アプリの公開入口
- `features/simulator/`: 操作画面・三面図・編集／入出力フック・外部操作ツール
- `app/globals.css`: 画面のスタイル
- `lib/desk-model.ts`: 座標、寸法、重なり判定
- `lib/size-presets.ts`: 用紙・モニター・ノートPCのサイズ辞書
- `lib/layout-file.ts`: `.layout.json` の保存と読み込み
- `public/`: アイコンとリンクカード画像（SVG原稿とPNG）
- `src/main.tsx`: アプリの起動処理

## テストと動作仕様

初回は `npm run test:install` でテスト用Chromiumを用意し、`npm test` で単体・UI・フック・既存ツール・実ブラウザのテストをまとめて実行します。実行ファイルに対応するテストが存在するかも検査します。

- `npm run test:unit`: 単体・UI・フック
- `npm run test:legacy`: 既存の外部操作ツール7件
- `npm run test:e2e`: 実SVG・WebGL・保存／読込・画面表示
- `npm run test:inventory`: 実行ファイルのテスト漏れ
- `npm run test:update-snapshots`: 確認した画面変更を基準画像へ反映

人間向け仕様は [docs/behavior-spec.md](docs/behavior-spec.md) です。動作と境界値を記載し、対応するテストIDを載せています。具体的な期待値は各テストに置き、仕様は独立して編集します。文書の変更後は `npm run docs:spec` で [HTML](docs/behavior-spec.html) を更新してください。既存の `docs/test-plan.html` も同じ仕様へ更新します。

動作を変更した際は対応するテストと仕様を両方修正し、`npm test` と `npm run build` を実行します。画像比較は同じOS・ブラウザ・画面サイズで確認し、差分を見てから基準画像を更新してください。現在の基準画像はWindows版Chromiumです。

## ビルドと公開

`npm run build` で静的ファイルを `dist/` に作成します。[GitHub Actions](.github/workflows/quality-and-deploy.yml) がビルドと全テストを実行し、mainへのpushで検証に成功した場合だけ、その実行で検証した `dist/` をCloudflare Pagesへ公開します。PR・作業ブランチ・手動実行では検証だけを行います。

E2Eは `E2E_PREVIEW=1` を指定して本番成果物を確認します。画像比較のOSを既存の基準とそろえるため、検証ジョブはWindows、公開ジョブはLinuxを使います。[仕様とE2Eの対応](docs/e2e-coverage.md) を参照してください。

初期設定はCloudflare PagesのBranch controlで本番・プレビューのGit自動公開を両方無効にし、GitHubのActions Secretsへ `CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN`（対象アカウントのCloudflare Pages Edit権限）を登録します。[Cloudflareの手順](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)に従い、Git自動公開によるテストの迂回を防ぎます。

リファクタは `codex/refactor-*` ブランチで管理し、コミットとPRは `chore(scope): 内容` の形式で運用します。mainへの反映はPRで行います。

公開先: https://desk-plan-simulator-git.pages.dev/

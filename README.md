# 机上レイアウトシミュレータ

机と物の配置を上面・正面・側面の三面図で編集する TypeScript / React アプリです。机の幅・奥行き・高さを変更できます。配置は `.layout.json` ファイルで保存・読み込みできます。

## 起動

Node.js 22.13 以上で `npm ci`、`npm run dev` を実行してください。

## ビルドと公開

`npm run build` で静的ファイルを `dist/` に作成します。Cloudflare Pages に直接公開する場合は `npx wrangler pages deploy dist --project-name=desk-plan-simulator` を実行します。GitHub 連携で公開する場合はビルドコマンドを `npm run build`、出力ディレクトリを `dist` に設定します。

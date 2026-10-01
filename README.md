# 机上レイアウトシミュレータ

机と物の配置を上面・正面・側面の三面図で編集する TypeScript / React アプリです。机の幅・奥行き・高さを変更できます。レイアウト名を付けて `.layout.json` ファイルで保存・読み込みでき、対応ブラウザでは保存先を選択できます。

## 起動

Node.js 22.13 以上で `npm ci`、`npm run dev` を実行してください。

## ビルドと公開

`npm run build` で静的ファイルを `dist/` に作成します。`main` ブランチへ変更をプッシュすると、GitHub と連携した Cloudflare Pages が自動でビルド・公開します。

公開先: https://desk-plan-simulator-git.pages.dev/

# 開発運用

- 変更は作業ブランチで管理する。リファクタは `codex/refactor-*`、運用・テスト変更は `codex/chore-*` を使う。
- コミットとPRタイトルは `chore(scope): 内容` の形式にする。
- 動作や境界を変更したら、対応テストと `docs/behavior-spec.md` を更新し、`npm run docs:spec` でHTMLを再生成する。
- mainへ反映する前に本番ビルドと全テストを通す。E2Eは `E2E_PREVIEW=1` で本番成果物を確認する。
- 公開は `.github/workflows/quality-and-deploy.yml` に任せる。テストを迂回するCloudflareのGit自動公開を再有効化しない。
- 画像差分は目視確認してから基準画像を更新する。

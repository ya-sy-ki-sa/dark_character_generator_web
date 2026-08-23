# Dark Character Generator Web

ブラウザ上で「闇堕ちキャラクター」の設定を組み立て、生成 AI でショートストーリーを作るシングルページアプリです。世界観や闇堕ち度合い、各種属性を入力・選択して生成を実行すると、結果と実際に使われたプロンプトを確認できます。デモ生成には Cloudflare Pages Functions 経由の Workers AI を使用し、環境変数でモデル ID を差し替えられます（未設定時は `@cf/openai/gpt-oss-20b`）。

> 本アプリの実装は、ほとんどを AI コーディングで生成しています。

## 利用上の注意

- 生成結果の正確性・安全性・権利関係は保証されません。出力は利用者自身の責任で使用してください。
- 入力内容は選択した AI プロバイダへ送信されます。個人情報や機密情報は入力しないでください。
- OpenAI の任意キー連携はブラウザから直接 API を呼ぶ開発用機能です。キーは `localStorage` に保存しませんが、本番運用ではサーバー側プロキシと Secret 管理へ移行してください。

## 技術スタック

- React 19.2.8 / React DOM 19.2.8
- Vite 8.2.2 / `@vitejs/plugin-react` 6.1.0
- TypeScript 6.0.3
- Oxlint 1.79.0 / Oxfmt 0.64.0
- Vitest 4.1.11
- Cloudflare Pages Functions / Wrangler 4.125.0
- Cloudflare Workers AI `@cf/openai/gpt-oss-20b`

TypeScript 7 は正式版ですが、compiler API をまだ同梱せず周辺ツールの対応途上です。このプロジェクトでは、現行の Vite React 公式テンプレートと互換性のある TypeScript 6 系の最新パッチを採用しています。

## 必要な環境

- Node.js 24.19.0 LTS
- npm 11.17.0 以上

`.nvmrc` を利用する場合は次のように準備します。

```bash
nvm install
nvm use
npm ci
```

`package-lock.json` は再現可能なインストールのためコミット対象です。通常は `npm install` ではなく `npm ci` を使用してください。

## ローカル開発

フロントエンドだけをホットリロードで開発する場合:

```bash
npm run dev
```

この Vite 開発サーバー単体では Pages Functions を実行しないため、`/api/ai` を使うデモ生成はローカルのフォールバック表示になります。

Pages Functions を含めて確認する場合は、ローカル Secret を用意して Wrangler で起動します。

```bash
cp .dev.vars.example .dev.vars
npm run dev:pages
```

`dev:pages` は本番ビルド後、通常 `http://localhost:8788` で `dist` と Pages Functions を配信します。UI の編集中は `npm run dev`、API 結合確認時は `npm run dev:pages` を使い分けてください。

`.dev.vars` の内容:

```dotenv
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
DEMO_MODEL_ID=@cf/openai/gpt-oss-20b
```

Turnstile のサイトキーは Vite のビルド時に必要なため、ローカルでは `.env.local` に設定します。

```dotenv
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

`.dev.vars` と `.env*` は Git の対象外です。Vite 用の `.env` に値を置いても Pages Functions には渡らない点に注意してください。

## Cloudflare Pages への設定

Pages の production / preview 環境には次を設定します。

- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID
- `CLOUDFLARE_API_TOKEN`: Workers AI を実行できる暗号化 Secret
- `TURNSTILE_SECRET_KEY`: Turnstile ウィジェットを検証する暗号化 Secret
- `DEMO_MODEL_ID`: デモで使用する Workers AI のモデル ID（省略時は `@cf/openai/gpt-oss-20b`）

フロントエンドのビルド環境には `VITE_TURNSTILE_SITE_KEY` も設定してください。

ビルドコマンドは `npm run build`、出力ディレクトリは `dist` です。

このリポジトリには、既存の Pages ダッシュボード設定を誤って上書きしないよう `wrangler.jsonc` を置いていません。設定をコード管理へ移す場合は、先に `wrangler pages download config <PROJECT_NAME>` で現在の設定を取得し、内容を確認してください。

## 開発コマンド

| コマンド                  | 内容                                              |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Vite 開発サーバーを起動                           |
| `npm run dev:pages`       | ビルド後に Pages Functions を含めて起動           |
| `npm run format`          | Oxfmt で対象ファイルを整形                        |
| `npm run format:check`    | Oxfmt の整形差分がないことを検査                  |
| `npm run lint`            | Oxlint を実行                                     |
| `npm run lint:fix`        | 自動修正可能な lint 違反を修正                    |
| `npm test`                | Vitest の全テストを1回実行                        |
| `npm run test:watch`      | Vitest を監視モードで起動                         |
| `npm run typecheck`       | フロント、Vite 設定、Pages Functions を型チェック |
| `npm run build`           | 全型チェック後に本番ビルド                        |
| `npm run build:functions` | Wrangler で Pages Functions をバンドル検証        |
| `npm run check`           | format・lint・test・型・両ビルドを一括検証        |
| `npm run preview`         | 本番ビルドを Vite でプレビュー                    |

GitHub Actions でも Node.js 24 と `npm ci` を使い、`npm run check`、registry署名検証、high以上の脆弱性監査を実行します。Dependabot は npm パッケージと GitHub Actions の更新を毎週確認します。

## 依存関係の安全性

npm の install script は `.npmrc` で未承認パッケージを拒否します。現在はビルドに必要な `esbuild`、`workerd`、macOS 向けの `fsevents@2.3.3` だけを `package.json#allowScripts` で許可しています。依存更新で新しい script が追加された場合は、内容を確認してから許可リストを更新してください。

## ライセンス

このプロジェクトは [MIT License](./LICENSE) で提供されています。

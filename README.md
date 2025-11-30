# Dark Character Generator Web

ブラウザ上で「闇堕ちキャラクター」の設定を組み立て、生成 AI でプロットを作るシングルページアプリです。世界観や闇堕ち度合い、各種属性を入力・選択して生成を実行すると、結果と実際に使われたプロンプトを確認できます。デモでは Cloudflare Workers AI（`@cf/openai/gpt-oss-20b`）を経由して生成します。

> 本アプリの実装は、ほとんどを AI コーディングで生成しています。

## 利用上の注意
- 本アプリは生成結果の正確性・安全性・権利関係を保証しません。出力の利用は利用者自身の責任で行ってください。
- 入力したテキストや生成結果は外部の AI プロバイダに送信されます。個人情報・機密情報の入力は避けてください。
- プロバイダ設定で入力した API キーはブラウザの `localStorage` に保存できます。共有端末では保存を避けるか、利用後に設定をクリアしてください。

## 技術スタック
- フロントエンド: Vite + React + TypeScript。UI はシングルページで動作します。
- 配信/バックエンド: Cloudflare Pages を前提に、Pages Functions（`functions/api/ai.ts`）で AI へのプロキシを実装。
- 生成エンジン: デモモードで Cloudflare Workers AI（`@cf/openai/gpt-oss-20b`）。設定画面で OpenAI 等を選択できる拡張余地あり。
- 主要ライブラリ: React 18、TypeScript 5、Vite 5（`package.json` 参照）。

## WSL + VS Code 前提のローカル開発
事前に WSL (Ubuntu) と Node.js (推奨: LTS) をインストールしておきます。
1. WSL のターミナルでリポジトリを開き VS Code を起動  
   ```bash
   cd /path/to/dark_character_generator_web
   code .
   ```
2. VS Code の統合ターミナルで依存関係をインストール  
   ```bash
   npm install
   ```
3. 環境変数を `.env` に設定（後述）。  
4. 開発サーバーを起動し、表示された URL（例: `http://localhost:5173/`）をブラウザーで開く  
   ```bash
   npm run dev
   ```
編集内容はホットリロードで即時反映されます。ビルドは `npm run build`、型チェックは `npm run lint` で実行できます。

## Cloudflare Pages 公開時の環境変数
Pages Functions から Workers AI を呼び出すため、Cloudflare Pages のプロジェクト設定に以下を追加してください。ローカル開発でも `.env` に同じキーを置くと、Vite の開発サーバー経由で Functions を動かせます。
- `CLOUDFLARE_ACCOUNT_ID` : Cloudflare アカウント ID
- `CLOUDFLARE_API_TOKEN` : Workers AI を実行可能な API トークン

`.env` の例:
```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## ライセンス
このプロジェクトは [MIT License](./LICENSE) で提供されています。

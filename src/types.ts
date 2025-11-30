export type AttributeCategory =
  | 'APPEARANCE'
  | 'CHARACTER_TRAIT'
  | 'MINDSET'
  | 'MOTIVE'
  | 'TRANSFORMATION_PROCESS';

export type AttributeOption = {
  id?: string;
  category: AttributeCategory;
  name: string;
  description: string;
};

export type WorldGenre = {
  id?: string;
  name: string;
};

export type InputMode = 'AUTO' | 'SEMI_AUTO';

export type DarknessPreset = {
  value: 50 | 100 | 150 | 200 | 250;
  label: string;
  description: string;
};

export type CharacterInput = {
  mode: InputMode;
  worldGenre: WorldGenre;
  characterTraits: AttributeOption[];
  traitFreeText?: string;
  protagonistScore: 1 | 2 | 3 | 4 | 5;
  darknessFreeText?: string;
  darknessLevel: DarknessPreset;
  darknessSelections: Record<AttributeCategory, AttributeOption[]>;
};

/**
 * AI プロバイダの識別子。
 * - DEMO: Cloudflare Workers AI（Pages Functions）の組み込み環境変数を利用したデモ呼び出し。
 * - OPENAI など: 各サービスの API キーとモデルをクライアントから指定する。
 */
export type ProviderType = 'DEMO' | 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

/**
 * プロバイダ設定。
 * DEMO の場合は Cloudflare 環境変数（CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN）を使うため
 * apiKey や model を入力しなくても動作する。
 */
export type ProviderConfig = {
  providerType: ProviderType;
  apiKey?: string;
  model?: string;
};

export type GeneratedCharacter = {
  narrative: string;
  createdAt: string;
};

export type GenerationResponse = {
  character: GeneratedCharacter;
  warning?: string;
  prompt?: string;
  usedProvider: boolean;
};

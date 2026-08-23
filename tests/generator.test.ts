import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CharacterInput, ProviderConfig } from '../src/types';

const providerMocks = vi.hoisted(() => ({
  callCloudflareAI: vi.fn<(prompt: string, turnstileToken?: string) => Promise<string>>(),
  callOpenAI: vi.fn<(prompt: string, providerConfig: ProviderConfig) => Promise<string>>(),
}));

vi.mock('../src/services/cloudflare-client', () => ({
  callCloudflareAI: providerMocks.callCloudflareAI,
}));

vi.mock('../src/services/openai-client', () => ({
  callOpenAI: providerMocks.callOpenAI,
}));

import { generateCharacter } from '../src/services/generator';

const input: CharacterInput = {
  mode: 'SEMI_AUTO',
  worldGenre: { id: 'cyberpunk', name: 'サイバーパンク' },
  characterTraits: [
    {
      id: 'calm',
      category: 'CHARACTER_TRAIT',
      name: '冷静',
      description: '危機でも判断を誤らない',
    },
  ],
  traitFreeText: 'かつては都市を守る捜査官だった。',
  protagonistScore: 4,
  darknessFreeText: '失われた記憶を取り戻そうとしている。',
  darknessLevel: {
    value: 150,
    label: '深い闇',
    description: '正義と悪意がせめぎ合う段階',
  },
  darknessSelections: {
    APPEARANCE: [],
    CHARACTER_TRAIT: [],
    MINDSET: [
      {
        id: 'nihilism',
        category: 'MINDSET',
        name: '虚無主義',
        description: 'すべての価値を疑う',
      },
    ],
    MOTIVE: [],
    TRANSFORMATION_PROCESS: [],
  },
};

const runGeneration = async (providerConfig: ProviderConfig, turnstileToken?: string) => {
  const resultPromise = generateCharacter(input, providerConfig, turnstileToken);
  await vi.advanceTimersByTimeAsync(250);
  return resultPromise;
};

describe('generateCharacter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:34:56.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('OpenAIの生成結果と使用したプロンプトを返す', async () => {
    const providerConfig: ProviderConfig = {
      providerType: 'OPENAI',
      apiKey: 'test-api-key',
      model: 'test-model',
    };
    providerMocks.callOpenAI.mockResolvedValue('OpenAIで生成した物語');

    const result = await runGeneration(providerConfig);

    expect(providerMocks.callOpenAI).toHaveBeenCalledOnce();
    expect(providerMocks.callOpenAI).toHaveBeenCalledWith(expect.any(String), providerConfig);
    const prompt = providerMocks.callOpenAI.mock.calls[0]?.[0];
    expect(prompt).toContain('[世界観ジャンル]\nサイバーパンク');
    expect(prompt).toContain('[キャラクター属性メモ]\nかつては都市を守る捜査官だった。');
    expect(prompt).toContain('【精神性】\n・虚無主義 - すべての価値を疑う');
    expect(result).toMatchObject({
      character: {
        narrative: 'OpenAIで生成した物語',
        createdAt: '2026-08-23T12:34:56.250Z',
      },
      usedProvider: true,
      warning: undefined,
    });
  });

  it('OpenAIが失敗した場合は選択内容から生成した文章へフォールバックする', async () => {
    providerMocks.callOpenAI.mockRejectedValue(new Error('simulated provider failure'));

    const result = await runGeneration({
      providerType: 'OPENAI',
      apiKey: 'test-api-key',
    });

    expect(result.usedProvider).toBe(false);
    expect(result.warning).toBe('OpenAI 生成に失敗したため選択内容のみ表示します。');
    expect(result.character.narrative).toContain('【闇堕ちキャラクター概要】');
    expect(result.character.narrative).toContain('精神性は虚無主義。');
  });

  it('APIキーがないOpenAI設定ではプロバイダを呼ばずデモ文章へフォールバックする', async () => {
    const result = await runGeneration({ providerType: 'OPENAI', apiKey: '   ' });

    expect(providerMocks.callOpenAI).not.toHaveBeenCalled();
    expect(providerMocks.callCloudflareAI).not.toHaveBeenCalled();
    expect(result.usedProvider).toBe(false);
    expect(result.warning).toBe(
      'デモモードで生成しました。プロバイダ設定を更新すると外部生成を試せます。',
    );
    expect(result.character.narrative).toContain('サイバーパンク');
  });

  it('DEMOプロバイダへTurnstileトークンを渡して生成結果を返す', async () => {
    providerMocks.callCloudflareAI.mockResolvedValue('Cloudflareで生成した物語');

    const result = await runGeneration({ providerType: 'DEMO' }, 'test-turnstile-token');

    expect(providerMocks.callCloudflareAI).toHaveBeenCalledOnce();
    expect(providerMocks.callCloudflareAI).toHaveBeenCalledWith(
      expect.stringContaining('[闇堕ち度 (50%–250% 100%で完全敵化)]'),
      'test-turnstile-token',
    );
    expect(result.character.narrative).toBe('Cloudflareで生成した物語');
    expect(result.usedProvider).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('DEMOプロバイダが失敗した場合はデモ文章へフォールバックする', async () => {
    providerMocks.callCloudflareAI.mockRejectedValue(new Error('simulated proxy failure'));

    const result = await runGeneration({ providerType: 'DEMO' }, 'test-turnstile-token');

    expect(result.usedProvider).toBe(false);
    expect(result.warning).toBe(
      'デモモードで生成しました。プロバイダ設定を更新すると外部生成を試せます。',
    );
    expect(result.character.narrative).toContain('■生成ストーリー');
  });

  it('未実装プロバイダでは外部呼び出しをせずフォールバックする', async () => {
    const result = await runGeneration({ providerType: 'ANTHROPIC', apiKey: 'unused' });

    expect(providerMocks.callOpenAI).not.toHaveBeenCalled();
    expect(providerMocks.callCloudflareAI).not.toHaveBeenCalled();
    expect(result.usedProvider).toBe(false);
    expect(result.warning).toBe('このプロバイダは現在未実装のため選択内容のみ表示します。');
  });
});

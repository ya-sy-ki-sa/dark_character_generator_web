import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  ALIGNMENTS,
  APPEARANCE_OPTIONS,
  DARKNESS_CATEGORIES,
  DARKNESS_PRESETS,
  DEFAULT_WORLD,
  MINDSET_OPTIONS,
  MOTIVE_OPTIONS,
  TRAIT_OPTIONS,
  TRANSFORMATION_OPTIONS,
  WORLD_GENRES,
  createDefaultSelections,
} from './constants';
import { PromptModal } from './components/PromptModal';
import { LicenseModal } from './components/LicenseModal';
import { UsageInfoModal } from './components/UsageInfoModal';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { ResultModal } from './components/ResultModal';
import { useProviderSettings } from './hooks/useProviderSettings';
import { generateCharacter } from './services/generator';
import {
  AttributeCategory,
  AttributeOption,
  CharacterInput,
  DarknessPreset,
  GenerationResponse,
  InputMode,
} from './types';

type TurnstileWidget = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  execute?: (widgetId: string) => void;
  reset?: (widgetId: string) => void;
};

type TurnstileWindow = typeof window & { turnstile?: TurnstileWidget };

function formatPreset(preset: DarknessPreset) {
  return `${preset.value}%（${preset.label}）`;
}

function App() {
  const [mode, setMode] = useState<InputMode>('AUTO');
  const [worldGenre, setWorldGenre] = useState<string>(DEFAULT_WORLD);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [traitMemo, setTraitMemo] = useState('');
  const [protagonistScore, setProtagonistScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [darknessPresetValue, setDarknessPresetValue] = useState<DarknessPreset['value']>(100);
  const [darknessSelections, setDarknessSelections] = useState<Record<AttributeCategory, string[]>>(createDefaultSelections);
  const [darknessMemo, setDarknessMemo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isUsageInfoOpen, setIsUsageInfoOpen] = useState(false);
  const [isVerifyingTurnstile, setIsVerifyingTurnstile] = useState(false);
  const [turnstileError, setTurnstileError] = useState('');
  const {
    providerConfig,
    persistSetting,
    setPersistSetting,
    setProviderConfig,
    saveSettings,
    clearSettings,
  } = useProviderSettings();

  const currentPreset = useMemo(
    () => DARKNESS_PRESETS.find((preset) => preset.value === darknessPresetValue) ?? DARKNESS_PRESETS[0],
    [darknessPresetValue]
  );

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  const turnstileWidgetRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileResolve = useRef<((token: string) => void) | null>(null);
  const turnstileReject = useRef<((reason?: unknown) => void) | null>(null);
  const isTurnstileExecuting = useRef(false);
  const turnstilePendingPromise = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (document.querySelector('script[data-turnstile-script]')) return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => {
      const turnstile = (window as TurnstileWindow).turnstile;
      if (!turnstile || !turnstileWidgetRef.current) return;
      turnstileWidgetId.current = turnstile.render(turnstileWidgetRef.current, {
        sitekey: turnstileSiteKey,
        size: 'invisible',
        callback: (token: string) => {
          turnstileResolve.current?.(token);
          turnstileResolve.current = null;
          turnstileReject.current = null;
        },
        'error-callback': () => {
          turnstileReject.current?.(new Error('Turnstile verification failed.'));
          turnstileResolve.current = null;
          turnstileReject.current = null;
        },
        'expired-callback': () => {
          turnstileReject.current?.(new Error('Turnstile token expired.'));
          turnstileResolve.current = null;
          turnstileReject.current = null;
        },
      });
    };

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [turnstileSiteKey]);

  const protagonistAlignment = useMemo(
    () => ALIGNMENTS.find((item) => item.score === protagonistScore),
    [protagonistScore]
  );

  const updateTrait = (name: string) => {
    setSelectedTraits((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  };

  const toggleDarkness = (category: AttributeCategory, name: string) => {
    setDarknessSelections((prev) => {
      const previous = prev[category] ?? [];
      const updated = previous.includes(name) ? previous.filter((item) => item !== name) : [...previous, name];
      return { ...prev, [category]: updated };
    });
  };

  const validate = (): string => {
    if (!worldGenre.trim()) {
      return '世界観ジャンルを入力してください。';
    }
    const allowedValues = DARKNESS_PRESETS.map((preset) => preset.value);
    if (!allowedValues.includes(darknessPresetValue)) {
      return '闇堕ち度は用意されたプリセットから選択してください。';
    }
    const hasDarknessSelection = DARKNESS_CATEGORIES.some(({ key }) => (darknessSelections[key] ?? []).length > 0);
    if (!hasDarknessSelection) {
      return '闇堕ちカテゴリから少なくとも1つは選択してください。';
    }
    return '';
  };

  const clearSemiautoSelections = () => {
    setSelectedTraits([]);
    setTraitMemo('');
  };

  const requestTurnstileToken = async (): Promise<string> => {
    if (!turnstileSiteKey) {
      throw new Error('Turnstileのサイトキーが設定されていません。');
    }

    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile || !turnstileWidgetId.current) {
      throw new Error('Turnstileの初期化が完了していません。少し待ってから再度お試しください。');
    }

    if (turnstilePendingPromise.current) {
      return turnstilePendingPromise.current;
    }

    const promise = new Promise<string>((resolve, reject) => {
      turnstileResolve.current = (token) => {
        isTurnstileExecuting.current = false;
        turnstilePendingPromise.current = null;
        resolve(token);
      };

      turnstileReject.current = (reason) => {
        isTurnstileExecuting.current = false;
        turnstilePendingPromise.current = null;
        reject(reason);
      };

      try {
        isTurnstileExecuting.current = true;
        turnstile.reset?.(turnstileWidgetId.current!);
        turnstile.execute?.(turnstileWidgetId.current!);
      } catch (error) {
        isTurnstileExecuting.current = false;
        turnstilePendingPromise.current = null;
        reject(error);
      }
    });

    turnstilePendingPromise.current = promise;
    return promise;
  };

  const handleGenerate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setInfo('');
    setTurnstileError('');
    setIsGenerating(true);

    const traitSelections = TRAIT_OPTIONS.filter((trait) => selectedTraits.includes(trait.name));
    const darknessSelectionsResolved: Record<AttributeCategory, AttributeOption[]> = {
      APPEARANCE: APPEARANCE_OPTIONS.filter((option) => darknessSelections.APPEARANCE.includes(option.name)),
      CHARACTER_TRAIT: TRAIT_OPTIONS.filter((option) => darknessSelections.CHARACTER_TRAIT.includes(option.name)),
      MINDSET: MINDSET_OPTIONS.filter((option) => darknessSelections.MINDSET.includes(option.name)),
      MOTIVE: MOTIVE_OPTIONS.filter((option) => darknessSelections.MOTIVE.includes(option.name)),
      TRANSFORMATION_PROCESS: TRANSFORMATION_OPTIONS.filter((option) => darknessSelections.TRANSFORMATION_PROCESS.includes(option.name)),
    };

    const input: CharacterInput = {
      mode,
      worldGenre: { name: worldGenre.trim() },
      characterTraits: traitSelections,
      traitFreeText: traitMemo,
      protagonistScore,
      darknessFreeText: darknessMemo,
      darknessLevel: currentPreset,
      darknessSelections: darknessSelectionsResolved,
    };

    try {
      let turnstileToken: string | undefined;
      if (providerConfig.providerType === 'DEMO') {
        setIsVerifyingTurnstile(true);
        turnstileToken = await requestTurnstileToken();
        setIsVerifyingTurnstile(false);
      }

      const result = await generateCharacter(input, providerConfig, turnstileToken);
      setResponse(result);
      setIsResultOpen(true);
      if (result.warning) {
        setInfo(result.warning);
      }
    } catch (generationError) {
      console.error(generationError);
      if (providerConfig.providerType === 'DEMO') {
        setTurnstileError('Bot判定に失敗しました。ページを再読み込みして再試行してください。');
      }
      setError('生成中に問題が発生しました。再度お試しください。');
    } finally {
      setIsVerifyingTurnstile(false);
      setIsGenerating(false);
    }
  };

  const handleSaveSettings = () => {
    saveSettings();
    setIsSettingsOpen(false);
    setInfo('設定を更新しました。');
  };

  const handleClearSettings = () => {
    clearSettings();
    setInfo('保存済み設定をクリアしました。');
  };

  const resetDarkness = (value: DarknessPreset['value']) => {
    setDarknessPresetValue(value);
  };

  const totalSelections = Object.values(darknessSelections).reduce((acc, list) => acc + list.length, 0);

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Dark Character Generator</p>
          <h1>闇堕ちキャラクタージェネレーター</h1>
          <p className="lede">
            ブラウザで闇堕ち設定を組み立て、生成AIを利用して闇堕ちキャラクターを作成。生成時のプロンプトも確認できます。
          </p>
          <div className="hero-actions">
            <button className="ghost" type="button" onClick={() => setIsSettingsOpen(true)}>
              ⚙️ プロバイダ設定
            </button>
            <span className="pill inline">{providerConfig.providerType === 'DEMO' ? 'デモモード' : `${providerConfig.providerType} を使用`}</span>
          </div>
        </div>
        <div className="badge">Vite + React</div>
      </header>

      <section className="card">
        <div className="section-header">
          <h2>モードと世界観</h2>
          <p>世界観ジャンル、生成モード、闇堕ち前の立ち位置を指定します。</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="label">モード</label>
            <div className="inline-options">
              <label className="chip">
                <input
                  type="radio"
                  name="mode"
                  value="AUTO"
                  checked={mode === 'AUTO'}
                  onChange={() => {
                    setMode('AUTO');
                    clearSemiautoSelections();
                  }}
                />
                オート
              </label>
              <label className="chip">
                <input
                  type="radio"
                  name="mode"
                  value="SEMI_AUTO"
                  checked={mode === 'SEMI_AUTO'}
                  onChange={() => setMode('SEMI_AUTO')}
                />
                セミオート
              </label>
            </div>
            <p className="hint">セミオートではキャラクター属性の指定が可能です。</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="world-genre">
              世界観ジャンル
            </label>
            <div className="input-with-action">
              <input
                id="world-genre"
                list="world-genres"
                className="input"
                placeholder="例: 異世界・ファンタジー"
                value={worldGenre}
                onChange={(event) => setWorldGenre(event.target.value)}
              />
              {worldGenre && (
                <button className="clear-input" type="button" aria-label="世界観ジャンルをクリア" onClick={() => setWorldGenre('')}>
                  ×
                </button>
              )}
            </div>
            <datalist id="world-genres">
              {WORLD_GENRES.map((genre) => (
                <option key={genre.name} value={genre.name} />
              ))}
            </datalist>
            <p className="hint">候補から選ぶか、自由に入力できます。</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="protagonist-score">
              主人公度（立ち位置）
            </label>
            <div className="slider-row">
              <input
                id="protagonist-score"
                type="range"
                min={1}
                max={5}
                step={1}
                value={protagonistScore}
                onChange={(event) => setProtagonistScore(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
              />
              <span className="pill">{protagonistScore}/5</span>
            </div>
            <p className="hint">{protagonistAlignment?.preview ?? 'スライダーで立ち位置を選択してください。'}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>キャラクター属性（セミオート向け）</h2>
          <p>キャラクターの素質を選び、メモを残せます。</p>
        </div>
        <div className="field">
          <div className={`checkbox-grid ${mode === 'AUTO' ? 'disabled-block' : ''}`} aria-disabled={mode === 'AUTO'}>
            {TRAIT_OPTIONS.map((trait) => (
              <label key={trait.name} className={`checkbox ${mode === 'AUTO' ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  disabled={mode === 'AUTO'}
                  checked={selectedTraits.includes(trait.name)}
                  onChange={() => updateTrait(trait.name)}
                />
                <span>
                  <strong>{trait.name}</strong>
                  <small>{trait.description}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="trait-memo">
            キャラクター属性メモ
          </label>
          <textarea
            id="trait-memo"
            className="textarea"
            placeholder="設定のメモや口調などを自由に書き込めます"
            value={traitMemo}
            onChange={(event) => setTraitMemo(event.target.value)}
            disabled={mode === 'AUTO'}
          />
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>闇堕ち選択</h2>
          <p>闇堕ちカテゴリを自由に組み合わせ、度合いをプリセットで指定します。</p>
        </div>

        <div className="darkness-grid">
          {DARKNESS_CATEGORIES.map(({ key, label, options }) => (
            <div key={key} className="field">
              <h3 className="subheading">{label}</h3>
              <div className="checkbox-grid compact">
                {options.map((option) => (
                  <label key={option.name} className="checkbox">
                    <input
                      type="checkbox"
                      checked={(darknessSelections[key] ?? []).includes(option.name)}
                      onChange={() => toggleDarkness(key, option.name)}
                    />
                    <span>
                      <strong>{option.name}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <label className="label" htmlFor="darkness-level">
            闇堕ち度
          </label>
          <div className="slider-row">
            <input
              id="darkness-level"
              type="range"
              min={50}
              max={250}
              step={50}
              value={darknessPresetValue}
              onChange={(event) => resetDarkness(Number(event.target.value) as DarknessPreset['value'])}
            />
            <span className="pill accent">{formatPreset(currentPreset)}</span>
          </div>
          <p className="hint">{currentPreset.description}</p>
        </div>

        <div className="field">
          <label className="label" htmlFor="darkness-memo">
            闇堕ちメモ
          </label>
          <textarea
            id="darkness-memo"
            className="textarea"
            placeholder="闇に落ちた理由、禁忌の力、失われたものなど"
            value={darknessMemo}
            onChange={(event) => setDarknessMemo(event.target.value)}
          />
        </div>
      </section>

      <section className="actions">
        {error && <div className="toast error">{error}</div>}
        {turnstileError && <div className="toast error">{turnstileError}</div>}
        {info && <div className="toast info">{info}</div>}
        <div className="status-line">
          <span>選択済みカテゴリ: {totalSelections} 件</span>
          <span>闇堕ち度プリセット: {formatPreset(currentPreset)}</span>
        </div>
        <button className="primary" type="button" onClick={handleGenerate} disabled={isGenerating || isVerifyingTurnstile}>
          {isGenerating || isVerifyingTurnstile ? '生成中...' : '闇堕ち設定を生成する'}
        </button>
      </section>

      <section className="card output">
        <div className="section-header">
          <h2>最新の生成概要</h2>
          <p>結果モーダルで全文を確認し、プロンプトも表示できます。</p>
        </div>
        {response ? (
          <div className="preview">
            <p className="meta">{response.usedProvider ? '設定されたプロバイダで生成' : 'デモ生成'} | {response.character.createdAt}</p>
            <p className="meta">{response.warning ?? 'プロンプト生成済み'}</p>
            <div className="preview-actions">
              <button className="secondary" type="button" onClick={() => setIsResultOpen(true)}>
                生成結果を開く
              </button>
              {response.prompt && (
                <button className="ghost" type="button" onClick={() => setIsPromptOpen(true)}>
                  プロンプトを表示
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="placeholder">設定を入力して「生成」ボタンを押すと、ここに最新結果の要約が表示されます。</p>
        )}
      </section>

      <div ref={turnstileWidgetRef} style={{ display: 'none' }} />

      {isSettingsOpen && (
        <ProviderSettingsModal
          providerConfig={providerConfig}
          persistSetting={persistSetting}
          onChangeProviderConfig={setProviderConfig}
          onChangePersist={setPersistSetting}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          onClear={handleClearSettings}
        />
      )}

      {isResultOpen && response && (
        <ResultModal
          response={response}
          onClose={() => setIsResultOpen(false)}
          onShowPrompt={() => setIsPromptOpen(true)}
        />
      )}

      {isPromptOpen && response?.prompt && (
        <PromptModal prompt={response.prompt} onClose={() => setIsPromptOpen(false)} />
      )}

      {isLicenseOpen && <LicenseModal onClose={() => setIsLicenseOpen(false)} />}

      {isUsageInfoOpen && <UsageInfoModal onClose={() => setIsUsageInfoOpen(false)} />}

      <footer className="app-footer">
        <span className="footer-note">このアプリではオープンソースライブラリを利用しています。</span>
        <div className="footer-actions">
          <button className="footer-link" type="button" onClick={() => setIsUsageInfoOpen(true)}>
            本サイトのご利用について
          </button>
          <button className="footer-link" type="button" onClick={() => setIsLicenseOpen(true)}>
            ライセンス情報を表示
          </button>
          <a
            className="footer-link"
            href="https://github.com/ya-sy-ki-sa/dark_character_generator_web"
            target="_blank"
            rel="noreferrer"
          >
            GitHub リポジトリ
          </a>
        </div>
      </footer>
    </main>
  );
}

export default App;

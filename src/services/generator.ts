import {
  AttributeCategory,
  AttributeOption,
  CharacterInput,
  DarknessPreset,
  GenerationResponse,
  ProviderConfig,
} from "../types";
import { callCloudflareAI } from "./cloudflare-client";
import { callOpenAI } from "./openai-client";

const ALIGNMENT_PROMPTS: Record<number, string> = {
  1: "物語開始時点で敵組織の中核として暗躍する立場",
  2: "敵側に傾き始めた反英雄として揺らぐ立場",
  3: "利害で動きどちらにも肩入れしない独立勢力の立場",
  4: "主人公陣営を陰で支える頼れる仲間という立場",
  5: "正義側の中心人物として物語を牽引する英雄的な立場",
};

const CATEGORY_LABEL: Record<AttributeCategory, string> = {
  APPEARANCE: "外見",
  CHARACTER_TRAIT: "キャラクター特性",
  MINDSET: "精神性",
  MOTIVE: "動機",
  TRANSFORMATION_PROCESS: "変化過程",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const OUTPUT_TOKENS = 1200;

const formatDarknessLevel = (preset: DarknessPreset) =>
  `${preset.value}%（${preset.label}）`;

const renderSelections = (options: AttributeOption[]) =>
  options
    .map((option) => `・${option.name} - ${option.description}`)
    .join("\n");

const buildCharacterAttributesSection = (input: CharacterInput) => {
  if (input.mode === "SEMI_AUTO" && input.characterTraits.length !== 0) {
    return ["[キャラクター属性]", renderSelections(input.characterTraits)].join(
      "\n"
    );
  }
  return "";
};

const buildTraitFreeTextSection = (traitFreeText?: string) => {
  if (!traitFreeText?.trim()) return "";
  return ["[キャラクター属性メモ]", traitFreeText.trim()].join("\n");
};

const buildProtagonistAlignmentSection = (
  protagonistScore: CharacterInput["protagonistScore"]
) =>
  [
    "[闇堕ち前の立ち位置]",
    `${
      ALIGNMENT_PROMPTS[protagonistScore] ?? "不明な立ち位置"
    } (主人公度 ${protagonistScore}/5)`,
  ].join("\n");

const buildDarknessSelectionsSection = (
  darknessSelections: Record<AttributeCategory, AttributeOption[]>
) => {
  const lines: string[] = ["[闇堕ちカテゴリと選択肢]"];
  let hasSelection = false;

  (Object.keys(darknessSelections) as AttributeCategory[]).forEach(
    (category) => {
      const selected = darknessSelections[category] ?? [];
      if (selected.length === 0) return;
      hasSelection = true;
      lines.push(`【${CATEGORY_LABEL[category]}】`);
      lines.push(renderSelections(selected));
    }
  );

  if (!hasSelection) {
    lines.push("（闇堕ちカテゴリは未選択）");
  }

  return lines.join("\n");
};

const buildDarknessLevelSection = (darknessLevel: DarknessPreset) =>
  [
    "[闇堕ち度 (50%–250% 100%で完全敵化)]",
    `${formatDarknessLevel(darknessLevel)}: ${darknessLevel.description}`,
  ].join("\n");

const buildDarknessFreeTextSection = (darknessFreeText?: string) => {
  if (!darknessFreeText?.trim()) return "";
  return ["[闇堕ちメモ]", darknessFreeText.trim()].join("\n");
};

const renderCategoryHighlights = (
  selections: Record<AttributeCategory, AttributeOption[]>
) =>
  (Object.keys(selections) as AttributeCategory[])
    .map((category) => {
      const selected = selections[category] ?? [];
      if (selected.length === 0) return "";
      const label = CATEGORY_LABEL[category];
      return `${label}は${selected.map((item) => item.name).join("、")}`;
    })
    .filter(Boolean)
    .join("。");

const buildPrompt = (input: CharacterInput) => {
  const sections: string[] = [
    "あなたはティーンエイジャー向け小説などでヒットメーカーを次々と生み出す一流の小説家です。",
    "ノワールやハードボイルド、人間の破壊的な欲望や心変わり、仲間の裏切りなど、ダークな展開の描写がとても得意で高く評価されています。",
    `以下に記載された闇堕ちキャラクターの設定情報をもとに、そのキャラクターの闇堕ちショートストーリーをティーンノベル向けの文体で、${OUTPUT_TOKENS}文字程度で作成してください。`,
    "",
    "作成するショートストーリーには、以下の要素を含めてください。",
    "世界観の説明、闇堕ちの前の基本情報及び描写、闇堕ちの経緯及び描写、闇堕ち後の基本情報及び描写。",
    "また、キャラクターが闇堕ちに至った心理的な揺らぎや事件の描写、闇堕ち後のビジュアルや能力、価値観の変化を盛り込んでください。",
    "その他、闇堕ちキャラクターを魅力的に演出する工夫を凝らしてください。",
    "箇条書きは使わず、段落構成でまとめてください。出力は日本語で行ってください。",
    "",
    "想定読者は、敵役／ヴィランの悪行に魅力を感じる層です。",
    "彼らにとって善のヒーローは敵視の対象であり、物語に求めるものは、強大な悪の力による圧倒的支配と、それに伴うヒーローの失墜です。",
    "かつて希望や正義の象徴であった人物が、最終的に悪に敗北する、あるいは悪の誘惑に屈してその力に耽溺するヴィランへと転化する展開を好みます。",
    "これらの物語は、圧倒的な悪を率直に描くため一見すると反社会的に見えうるが、現実の葛藤を発散・昇華する機会を提供する点で社会的意義があります。",
    "",
    "** ティーンノベルのようなエンターテイメントノベルの文体で書いてください **",
    "・三人称一元視点でキャラ内面に密着。キャラの感覚の描写で主観を強調。",
    "・端的で具体的なわかりやすい文章を中心とする。",
    "・闇堕ちによる感覚的快楽の強調を心がける。",
    "",
    "----------",
    "",
    "[世界観ジャンル]",
    input.worldGenre.name,
  ];
  const characterAttributes = buildCharacterAttributesSection(input);
  if (characterAttributes) {
    sections.push("", characterAttributes);
  }

  const traitFreeText = buildTraitFreeTextSection(input.traitFreeText);
  if (traitFreeText) {
    sections.push("", traitFreeText);
  }

  sections.push("", buildProtagonistAlignmentSection(input.protagonistScore));
  sections.push("", buildDarknessSelectionsSection(input.darknessSelections));
  sections.push("", buildDarknessLevelSection(input.darknessLevel));

  const darknessMemo = buildDarknessFreeTextSection(input.darknessFreeText);
  if (darknessMemo) {
    sections.push("", darknessMemo);
  }

  return sections.join("\n");
};

const buildNarrative = (input: CharacterInput): string => {
  const { worldGenre, protagonistScore, darknessLevel, darknessSelections } =
    input;
  const alignmentLine = ALIGNMENT_PROMPTS[protagonistScore] ?? "不明な立ち位置";

  const header: string[] = [
    "【闇堕ちキャラクター概要】",
    `世界観ジャンル: ${worldGenre.name}`,
    `モード: ${input.mode === "AUTO" ? "オート" : "セミオート"}`,
    `闇堕ち前の立ち位置: ${alignmentLine} (主人公度 ${protagonistScore}/5)`,
    "",
  ];

  const traitSection: string[] = [];
  if (input.mode === "SEMI_AUTO" && input.characterTraits.length > 0) {
    traitSection.push("■キャラクター属性");
    traitSection.push(renderSelections(input.characterTraits));
    if (input.traitFreeText?.trim()) {
      traitSection.push("");
      traitSection.push("メモ:");
      traitSection.push(input.traitFreeText.trim());
    }
    traitSection.push("");
  }

  const darknessSection: string[] = ["■闇堕ちカテゴリ"];
  (Object.keys(darknessSelections) as AttributeCategory[]).forEach(
    (category) => {
      const selected = darknessSelections[category] ?? [];
      if (selected.length === 0) return;
      darknessSection.push(`【${CATEGORY_LABEL[category]}】`);
      darknessSection.push(renderSelections(selected));
    }
  );
  darknessSection.push("");
  darknessSection.push(`闇堕ち度: ${formatDarknessLevel(darknessLevel)}`);
  darknessSection.push(`説明: ${darknessLevel.description}`);
  darknessSection.push("");

  const memoSection: string[] = [];
  if (input.darknessFreeText?.trim()) {
    memoSection.push("■闇堕ちメモ");
    memoSection.push(input.darknessFreeText.trim());
    memoSection.push("");
  }

  const highlights = renderCategoryHighlights(darknessSelections);
  const storyBody = [
    `${worldGenre.name}の世界で活躍していたキャラクターは、${alignmentLine}が闇への扉を開いた。`,
    highlights ? `${highlights}。` : "闇の属性はまだ不明瞭だ。",
    `闇堕ち度${formatDarknessLevel(
      darknessLevel
    )}の今、かつての姿を忘れ、独自の正義で世界を塗り替えようとしている。`,
  ].join("\n");

  const storySection: string[] = ["■生成ストーリー", storyBody];

  return [
    ...header,
    ...traitSection,
    ...darknessSection,
    ...memoSection,
    ...storySection,
  ].join("\n");
};

export const generateCharacter = async (
  input: CharacterInput,
  providerConfig: ProviderConfig
): Promise<GenerationResponse> => {
  const prompt = buildPrompt(input);
  const demoWarning =
    "デモモードで生成しました。プロバイダ設定を更新すると外部生成を試せます。";

  const fallbackNarrative = buildNarrative(input);
  let narrative = fallbackNarrative;
  let warning: string | undefined;
  let usedProvider = false;

  await wait(250);

  if (providerConfig.providerType === "OPENAI") {
    if (providerConfig.apiKey?.trim()) {
      try {
        narrative = await callOpenAI(prompt, providerConfig);
        usedProvider = true;
      } catch (error) {
        warning = "OpenAI 生成に失敗したため選択内容のみ表示します。";
        narrative = fallbackNarrative;
      }
    } else {
      warning = demoWarning;
    }
  } else if (providerConfig.providerType === "DEMO") {
    try {
      narrative = await callCloudflareAI(prompt, providerConfig);
      usedProvider = true;
    } catch (error) {
      warning = demoWarning;
      narrative = fallbackNarrative;
    }
  } else {
    warning = "このプロバイダは現在未実装のため選択内容のみ表示します。";
  }

  return {
    character: {
      narrative,
      createdAt: new Date().toISOString(),
    },
    prompt,
    usedProvider,
    warning,
  };
};

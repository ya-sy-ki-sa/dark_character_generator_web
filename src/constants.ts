import appearanceOptions from "./data/attribute-options/appearance.json";
import characterTraitsSeed from "./data/attribute-options/character-trait.json";
import mindsetOptions from "./data/attribute-options/mindset.json";
import motiveOptions from "./data/attribute-options/motive.json";
import transformationOptions from "./data/attribute-options/transformation-process.json";
import worldGenresSeed from "./data/world-genres.json";
import {
  AttributeCategory,
  AttributeOption,
  DarknessPreset,
  ProviderType,
  WorldGenre,
} from "./types";

export const DARKNESS_PRESETS: DarknessPreset[] = [
  {
    value: 50,
    label: "軽度",
    description:
      "闇の力に傾倒し、それをかなり受け入れているが、かつての情や未練がわずかに残る。状況と相手次第では説得に耳を傾けることもあるが、闇への決意は容易には揺らがない。",
  },
  {
    value: 100,
    label: "通常",
    description:
      "闇に完全支配され、価値観も忠誠も暗黒側に固定。自分の行動理念を達成するためには手段を選ばない。正義側から見れば完全敵対化であり、理詰めの説得も情の訴えも通用しない。",
  },
  {
    value: 150,
    label: "重め",
    description:
      "単なる闇堕ちを越え、深く闇そのものへと同化した段階。闇堕ち前の自我の多くは剥落し、力の行使それ自体が行動目的へとなり替わってきている。",
  },
  {
    value: 200,
    label: "過激",
    description:
      "世界を闇に塗りつぶすために動く存在となった段階。禁忌や人道は抑止力を失い、反対勢力は体系的に排除され、都市・国家規模で世界が闇に堕ち始める。",
  },
  {
    value: 250,
    label: "極端",
    description:
      "絶対的な闇の権化。存在そのものが破局の引き金となり、正義は壊滅、世界は取り返しのつかない崩壊へ傾く——物語は完全なバッドエンドに収束する。",
  },
];

export const ALIGNMENTS = [
  {
    score: 1,
    preview: "例: 開幕から敵組織の中核メンバーとして暗躍する。",
    prompt: "物語開始時点で敵組織の中核として暗躍する立場",
  },
  {
    score: 2,
    preview: "例: 敵側に傾いた反英雄として物語に関与する。",
    prompt: "敵側に傾き始めた反英雄として揺らぐ立場",
  },
  {
    score: 3,
    preview: "例: 利害で動く第三勢力、どちらにも肩入れしない。",
    prompt: "利害で動きどちらにも肩入れしない独立勢力の立場",
  },
  {
    score: 4,
    preview: "例: 主人公陣営の頼れる仲間として登場する。",
    prompt: "主人公陣営を陰で支える頼れる仲間という立場",
  },
  {
    score: 5,
    preview: "例: 正義側の中心人物として物語が始まる。",
    prompt: "正義側の中心人物として物語を牽引する英雄的な立場",
  },
];

export const PROVIDERS: { value: ProviderType; label: string }[] = [
  { value: "DEMO", label: "デモ（Cloudflare Workers AI）" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "ANTHROPIC", label: "Anthropic（未実装）" },
  { value: "GOOGLE", label: "Google（未実装）" },
];

export const TRAIT_OPTIONS = characterTraitsSeed as AttributeOption[];
export const APPEARANCE_OPTIONS = appearanceOptions as AttributeOption[];
export const MINDSET_OPTIONS = mindsetOptions as AttributeOption[];
export const MOTIVE_OPTIONS = motiveOptions as AttributeOption[];
export const TRANSFORMATION_OPTIONS =
  transformationOptions as AttributeOption[];

export const DARKNESS_CATEGORIES: {
  key: AttributeCategory;
  label: string;
  options: AttributeOption[];
}[] = [
  { key: "APPEARANCE", label: "外見", options: APPEARANCE_OPTIONS },
  { key: "MINDSET", label: "精神性", options: MINDSET_OPTIONS },
  { key: "MOTIVE", label: "動機", options: MOTIVE_OPTIONS },
  {
    key: "TRANSFORMATION_PROCESS",
    label: "変化過程",
    options: TRANSFORMATION_OPTIONS,
  },
];

export const WORLD_GENRES = worldGenresSeed as WorldGenre[];

export const DEFAULT_WORLD = WORLD_GENRES[0]?.name ?? "";

export const LOCAL_STORAGE_KEY = "darkness-generator-provider-config";

export const createDefaultSelections = (): Record<
  AttributeCategory,
  string[]
> => ({
  APPEARANCE: [],
  CHARACTER_TRAIT: [],
  MINDSET: [],
  MOTIVE: [],
  TRANSFORMATION_PROCESS: [],
});

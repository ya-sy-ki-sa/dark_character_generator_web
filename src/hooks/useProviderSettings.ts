import { useState } from 'react';
import { LOCAL_STORAGE_KEY, PROVIDERS } from '../constants';
import type { ProviderConfig, ProviderType } from '../types';

const DEFAULT_CONFIG: ProviderConfig = { providerType: 'DEMO', apiKey: '', model: '' };

const loadProviderConfig = (): ProviderConfig => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return DEFAULT_CONFIG;

    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;

    const stored = parsed as { providerType?: unknown; model?: unknown };
    const allowedProviders = PROVIDERS.map((item) => item.value);
    const providerType =
      typeof stored.providerType === 'string' &&
      allowedProviders.includes(stored.providerType as ProviderType)
        ? (stored.providerType as ProviderType)
        : 'DEMO';

    const model = typeof stored.model === 'string' ? stored.model : '';
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ providerType, model }));

    return {
      providerType,
      apiKey: '',
      model,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const hasStoredConfig = () => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export function useProviderSettings() {
  const [persistSetting, setPersistSetting] = useState(hasStoredConfig);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(loadProviderConfig);

  const saveSettings = () => {
    if (persistSetting) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          providerType: providerConfig.providerType,
          model: providerConfig.model ?? '',
        })
      );
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const clearSettings = () => {
    setProviderConfig(DEFAULT_CONFIG);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return {
    providerConfig,
    setProviderConfig,
    persistSetting,
    setPersistSetting,
    saveSettings,
    clearSettings,
  };
}

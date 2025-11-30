import { useEffect, useState } from 'react';
import { LOCAL_STORAGE_KEY, PROVIDERS } from '../constants';
import { ProviderConfig } from '../types';

const DEFAULT_CONFIG: ProviderConfig = { providerType: 'DEMO', apiKey: '', model: '' };

export function useProviderSettings() {
  const [persistSetting, setPersistSetting] = useState(true);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved) as ProviderConfig;
    const allowedProviders = PROVIDERS.map((item) => item.value);
    const providerType = allowedProviders.includes(parsed.providerType) ? parsed.providerType : 'DEMO';
    setProviderConfig({ ...parsed, providerType });
    setPersistSetting(true);
  }, []);

  const saveSettings = () => {
    if (persistSetting) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(providerConfig));
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

import { Dispatch, SetStateAction } from 'react';
import { PROVIDERS } from '../constants';
import { ProviderConfig, ProviderType } from '../types';
import { Modal } from './Modal';

interface ProviderSettingsModalProps {
  providerConfig: ProviderConfig;
  persistSetting: boolean;
  onChangeProviderConfig: Dispatch<SetStateAction<ProviderConfig>>;
  onChangePersist: (persist: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  onClear: () => void;
}

export function ProviderSettingsModal({
  providerConfig,
  persistSetting,
  onChangeProviderConfig,
  onChangePersist,
  onSave,
  onClose,
  onClear,
}: ProviderSettingsModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2>AI プロバイダ設定</h2>
      <p className="hint">ブラウザに設定を保存する場合、API キーの管理に注意してください。</p>
      <p className="hint">
        デモモードでは、Cloudflare Workers AIを利用します。無料枠上限に達している場合は、生成されません。
      </p>
      <div className="field">
        <label className="label" htmlFor="provider">
          プロバイダ種別
        </label>
        <select
          id="provider"
          className="input"
          value={providerConfig.providerType}
          onChange={(event) =>
            onChangeProviderConfig((prev) => ({ ...prev, providerType: event.target.value as ProviderType }))
          }
        >
          {PROVIDERS.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="api-key">
          API キー
        </label>
        <input
          id="api-key"
          className="input"
          type="password"
          placeholder="未入力の場合はデモモードで生成"
          value={providerConfig.apiKey ?? ''}
          onChange={(event) => onChangeProviderConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="model">
          モデル名
        </label>
        <input
          id="model"
          className="input"
          placeholder="例: gpt-4o-mini"
          value={providerConfig.model ?? ''}
          onChange={(event) => onChangeProviderConfig((prev) => ({ ...prev, model: event.target.value }))}
        />
      </div>
      <div className="field inline-row">
        <label className="checkbox inline">
          <input
            type="checkbox"
            checked={persistSetting}
            onChange={(event) => onChangePersist(event.target.checked)}
          />
          <span>ブラウザに設定を保存する</span>
        </label>
        <button className="ghost" type="button" onClick={onClear}>
          クリア
        </button>
      </div>
      <div className="modal-actions">
        <button className="primary" type="button" onClick={onSave}>
          保存
        </button>
        <button className="secondary" type="button" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </Modal>
  );
}

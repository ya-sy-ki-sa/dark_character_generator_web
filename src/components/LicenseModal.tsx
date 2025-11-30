import { LIBRARY_LICENSES } from '../data/licenses';
import { Modal } from './Modal';

interface LicenseModalProps {
  onClose: () => void;
}

export function LicenseModal({ onClose }: LicenseModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2>ライセンス情報</h2>
      <p className="hint">
        このアプリは以下のオープンソースソフトウェアを利用しています。配布・提供時には各ライブラリのライセンス表記が必要です。
      </p>

      <div className="license-list">
        {LIBRARY_LICENSES.map((library) => (
          <section key={library.name} className="license-card">
            <div className="license-header">
              <div>
                <h3>{library.name}</h3>
                <p className="meta">
                  バージョン: {library.version} / ライセンス: {library.license}
                  {library.homepage && (
                    <>
                      {' '}
                      | <a href={library.homepage}>公式サイト</a>
                    </>
                  )}
                </p>
              </div>
              <span className="pill">著作権表記が必要</span>
            </div>
            <p className="hint">{library.obligation}</p>
            <pre className="license-text">{library.text}</pre>
          </section>
        ))}
      </div>

      <div className="modal-actions">
        <button className="secondary" type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  );
}

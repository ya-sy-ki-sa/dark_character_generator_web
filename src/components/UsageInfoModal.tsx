import { Modal } from './Modal';

type UsageInfoModalProps = {
  onClose: () => void;
};

export function UsageInfoModal({ onClose }: UsageInfoModalProps) {
  return (
    <Modal onClose={onClose}>
      <h2>本サイトのご利用について</h2>
      <p className="hint">
        闇堕ちキャラクタージェネレーターは、創作活動をサポートするための実験的なデモアプリです。生成内容はフィクションであり、
        利用者の入力内容に基づいて即時に生成されます。
      </p>

      <section>
        <h3 className="subheading">概要</h3>
        <p>
          本サイトでは、ユーザーが指定した設定やキーワードをもとに、AI が闇堕ちキャラクターのプロンプトや概要を生成します。
          プロンプトの表示や結果モーダルから内容をコピーして、個人の創作やアイデア出しに活用いただけます。
        </p>
      </section>

      <section>
        <h3 className="subheading">ご利用上の注意</h3>
        <ul>
          <li>生成されるテキストは自動生成であり、正確性や適切性を保証するものではありません。</li>
          <li>公序良俗に反する目的や違法行為を助長する用途での利用は禁止されています。</li>
          <li>機密情報や個人情報は入力しないでください。入力内容はブラウザ上で処理されますが、自己責任でご利用ください。</li>
          <li>生成結果を公開・配布する場合は、関連する規約やライセンスを確認したうえでご対応ください。</li>
        </ul>
      </section>

      <div className="modal-actions">
        <button className="secondary" type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </Modal>
  );
}

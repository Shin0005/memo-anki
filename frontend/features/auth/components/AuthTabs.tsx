// 「ログイン / 新規登録」タブ。
// アクティブなタブは下線 + プライマリ色、非アクティブはグレー。
// 元 HTML の .tab-btn / .tab-btn.active に対応。

'use client';

export type AuthTab = 'login' | 'register';

type AuthTabsProps = {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
};

export default function AuthTabs({ active, onChange }: AuthTabsProps) {
  return (
    <div className="flex border-b border-gray-200">
      <TabButton
        label="ログイン"
        isActive={active === 'login'}
        onClick={() => onChange('login')}
      />
      <TabButton
        label="新規登録"
        isActive={active === 'register'}
        onClick={() => onChange('register')}
      />
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2 text-sm font-semibold cursor-pointer transition-colors',
        'border-b-2',
        isActive
          ? 'text-primary border-primary'
          : 'text-gray-500 border-transparent hover:text-gray-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

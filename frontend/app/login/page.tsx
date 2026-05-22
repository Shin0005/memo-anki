import AuthCard from '@/features/auth/components/AuthCard';
import LogoPill from '@/features/auth/components/LogoPill';
import CardTypeBadge from '@/features/card/components/CardTypeBadge';

//　本来はenumをどこかで管理すべきだが、今回はとりあえずこれだけあれば足りるので定数で。
const QUIZ = 1;

export default function LoginPage() {
  return (
    // body(min-h-screen flex flex-col) に乗っかって残り空間を埋める
    <div className="flex-1 flex flex-col bg-[#f7f7f8] text-gray-800">
      {/* 中央カード */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[960px] grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          {/* 左：プロダクト紹介*/}
          <div>
            {/* ロゴ */}
            <div className="mb-6">
              <LogoPill width={undefined} height={undefined} />
            </div>

            {/* タグライン + 説明 */}
            <h1 className="text-[24px] font-bold text-gray-900 leading-snug mb-3">
              メモが、そのまま記憶になる。
            </h1>
            <p className="text-[14px] text-gray-600 leading-relaxed mb-7">
              ノート感覚で書いたメモを、忘却曲線に合わせて復習タイミングを自動で設定。アプリを開くだけで、効率的に記憶を定着させることができます。
              <br />
              シンプルな NOTE と、Q&amp;A 形式の QUIZ
              を使い分けて記憶を定着させます。
            </p>

            {/* サンプルカード */}
            <div className="flex flex-col gap-2.5">
              <div className="bg-white border border-gray-200 rounded-[10px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2 mb-1.5 border-b border-gray-200 pb-2">
                  <CardTypeBadge type={QUIZ} />
                  <div className="text-[13px] font-semibold leading-[1.85] text-gray-800 whitespace-pre-wrap break-words">
                    NestJSで依存性を注入する「DI」とは何の略？
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[13px] font-semibold leading-[1.85] text-gray-800 whitespace-pre-wrap break-words">
                    → Dependency Injection（依存性注入） の略です。<br></br>
                    JavaやC#などのオブジェクト指向言語で広く使われている設計パターンで、クラスの依存関係を外部から注入することで、コードの柔軟性やテストのしやすさを向上させます。
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右：フォーム */}
          <AuthCard />
        </div>
      </main>
    </div>
  );
}

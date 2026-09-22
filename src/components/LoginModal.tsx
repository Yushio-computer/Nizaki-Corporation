import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, Train } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  reason?: string;
  onSuccessCallback?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  reason,
  onSuccessCallback,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 簡単デモログイン（実演用）
  const handleQuickLogin = (rank: 'レギュラー' | 'ゴールド' | 'プレミアム' = 'ゴールド') => {
    const demoUser: UserProfile = {
      memberId: 'KZ-88219',
      name: 'kanzaki.demo',
      email: 'kanzaki.demo@example.com',
      rank,
      joinDate: '2024-04-01',
    };
    onLogin(demoUser);
    setError(null);
    onClose();
    if (onSuccessCallback) {
      onSuccessCallback();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idOrEmail.trim()) {
      setError('会員IDまたはメールアドレスを入力してください。');
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください。');
      return;
    }

    const cleanInput = idOrEmail.trim();
    const userEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput.toLowerCase()}@kanzaki-rail.jp`;
    const memberId = cleanInput.includes('@') ? `KZ-${Math.floor(10000 + Math.random() * 90000)}` : cleanInput.toUpperCase();
    const displayName = cleanInput.includes('@') ? cleanInput.split('@')[0] : memberId;

    const user: UserProfile = {
      memberId,
      name: displayName,
      email: userEmail,
      rank: 'ゴールド',
      joinDate: new Date().toISOString().split('T')[0],
    };

    onLogin(user);
    setError(null);
    onClose();
    if (onSuccessCallback) {
      onSuccessCallback();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E5E2EE] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* ヘッダー */}
        <div className="relative bg-gradient-to-r from-[#221C35] via-[#3B1F68] to-[#5B21B6] text-white p-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-amber-400 text-[#221C35] text-[10px] font-black px-2 py-0.5 rounded shadow-xs tracking-wider">
              NIIZAKI ID
            </span>
            <span className="text-white/80 text-xs font-medium">神埼鉄道 公式会員サービス</span>
          </div>

          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <Train className="w-5 h-5 text-amber-300" />
            <span>{isRegisterMode ? '神埼ID 新規会員登録（無料）' : '神埼ID ログイン'}</span>
          </h3>

          {/* 理由の提示（なぜログインが必要か） */}
          {reason && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          )}
        </div>

        {/* ボディ */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* ワンタップ簡単ログイン（推奨・体験用） */}
          <div className="bg-[#F8F7FC] rounded-xl p-3.5 border border-[#EDE9FE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5B21B6] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ワンタップ簡単ログイン（お試し・実演用）
              </span>
              <span className="text-[10px] bg-[#EDE9FE] text-[#5B21B6] px-2 py-0.5 rounded-full font-bold">
                パスワード不要
              </span>
            </div>
            <p className="text-[11px] text-[#6B6380] leading-relaxed">
              神埼 太郎（ゴールド会員 / KZ-88219）として即座に認証し、予約・注文・イベントの全機能を開放します。
            </p>
            <button
              type="button"
              onClick={() => handleQuickLogin('ゴールド')}
              className="w-full h-10 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <span>神埼IDでワンタップ認証する</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#857D99]">
            <div className="h-px bg-[#E5E2EE] flex-1" />
            <span>またはID/メールでログイン</span>
            <div className="h-px bg-[#E5E2EE] flex-1" />
          </div>

          {/* 入力フォーム */}
          <form onSubmit={handleSubmit} action="#" method="post" autoComplete="on" className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="login-username" className="text-xs font-bold text-[#221C35]">
                メールアドレス または 会員ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  inputMode="email"
                  autoComplete="username webauthn"
                  value={idOrEmail}
                  onChange={(e) => setIdOrEmail(e.target.value)}
                  placeholder="example@gmail.com または KZ-88219"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-xs font-bold text-[#221C35]">
                パスワード
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete={isRegisterMode ? "new-password" : "current-password webauthn"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                />
              </div>
              <p className="text-[10px] text-[#857D99] pt-0.5">
                ※ Googleパスワードマネージャーの自動入力・保存に対応しています。
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#221C35] hover:bg-[#3B1F68] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer pt-1"
            >
              <span>{isRegisterMode ? '新規会員登録して認証' : 'ログインする'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* モード切替 */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-xs text-[#5B21B6] hover:underline font-bold cursor-pointer"
            >
              {isRegisterMode ? 'すでにアカウントをお持ちの方（ログイン）' : 'まだ神埼IDをお持ちでない方（新規無料登録）'}
            </button>
          </div>
        </div>

        {/* フッター規約 */}
        <div className="p-3 bg-[#F8F7FC] border-t border-[#E5E2EE] text-center text-[10px] text-[#857D99]">
          神埼鉄道 NIIZAKI ID 会員規約およびプライバシーポリシーに同意して利用します。
        </div>
      </div>
    </div>
  );
};

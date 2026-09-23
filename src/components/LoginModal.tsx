import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, Train, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';
import { sendVerificationCode, verifyAndRegister, loginWithPassword } from '../utils/accountApi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  reason?: string;
  onSuccessCallback?: () => void;
}

type RegisterStep = 'form' | 'verify';

const validatePassword = (pw: string): string | null => {
  if (pw.length < 6) return 'パスワードは6文字以上で入力してください。';
  if (!/[a-z]/.test(pw)) return 'パスワードには英字の小文字を1文字以上含めてください。';
  if (!/[A-Z]/.test(pw)) return 'パスワードには英字の大文字を1文字以上含めてください。';
  if (!/[0-9]/.test(pw)) return 'パスワードには数字を1文字以上含めてください。';
  if (!/[!-/:-@[-`{-~]/.test(pw)) return 'パスワードには記号（例: ! # % & など）を1文字以上含めてください。';
  return null;
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  reason,
  onSuccessCallback,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');

  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const resetAll = () => {
    setIsRegisterMode(false);
    setRegisterStep('form');
    setIdOrEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setError(null);
    setIsSubmitting(false);
    setResendCooldown(0);
  };

  if (!isOpen) return null;

  // 簡単デモログイン（実演用・パスワード不要）
  const handleQuickLogin = (rank: 'レギュラー' | 'ゴールド' | 'プレミアム' = 'ゴールド') => {
    const demoUser: UserProfile = {
      memberId: 'KZ-88219',
      name: 'kanzaki.demo',
      email: 'kanzaki.demo@example.com',
      rank,
      joinDate: '2024-04-01',
    };
    onLogin(demoUser);
    resetAll();
    onClose();
    if (onSuccessCallback) {
      onSuccessCallback();
    }
  };

  // ログイン処理（実アカウント: 神埼ID/GASバックエンドに照会）
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = idOrEmail.trim().toLowerCase();
    if (!email) {
      setError('メールアドレスを入力してください。');
      return;
    }
    if (!password) {
      setError('パスワードを入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithPassword(email, password);
      if (result.status === 'success' && result.user) {
        const user: UserProfile = {
          memberId: result.user.memberId,
          name: result.user.name,
          email: result.user.email,
          rank: result.user.rank as UserProfile['rank'],
          joinDate: result.user.joinDate,
        };
        onLogin(user);
        resetAll();
        onClose();
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      } else {
        setError(result.message || 'メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログイン中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 新規登録 ステップ1: 入力内容を検証して認証コードを送信
  const handleRegisterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = idOrEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('有効なメールアドレスを入力してください。');
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (password !== confirmPassword) {
      setError('確認用パスワードが一致しません。');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendVerificationCode(email);
      if (result.status === 'success') {
        setRegisterStep('verify');
        setResendCooldown(60);
      } else {
        setError(result.message || '認証コードの送信に失敗しました。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証コードの送信中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 新規登録 ステップ2: 届いた認証コードを検証して本登録
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('6桁の認証コードを入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const email = idOrEmail.trim().toLowerCase();
      const result = await verifyAndRegister(email, code, password);
      if (result.status === 'success' && result.user) {
        const user: UserProfile = {
          memberId: result.user.memberId,
          name: result.user.name,
          email: result.user.email,
          rank: result.user.rank as UserProfile['rank'],
          joinDate: result.user.joinDate,
        };
        onLogin(user);
        resetAll();
        onClose();
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      } else {
        setError(result.message || '認証コードが正しくありません。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const email = idOrEmail.trim().toLowerCase();
      const result = await sendVerificationCode(email);
      if (result.status === 'success') {
        setResendCooldown(60);
      } else {
        setError(result.message || '認証コードの再送信に失敗しました。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '再送信中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showingVerifyStep = isRegisterMode && registerStep === 'verify';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E5E2EE] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* ヘッダー */}
        <div className="relative bg-gradient-to-r from-[#221C35] via-[#3B1F68] to-[#5B21B6] text-white p-5">
          <button
            onClick={() => {
              resetAll();
              onClose();
            }}
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
            <span>
              {showingVerifyStep
                ? 'メール認証コードの入力'
                : isRegisterMode
                ? '神埼ID 新規会員登録（無料）'
                : '神埼ID ログイン'}
            </span>
          </h3>

          {/* 理由の提示（なぜログインが必要か） */}
          {reason && !showingVerifyStep && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          )}
        </div>

        {/* ボディ */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {!isRegisterMode && (
            <>
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
                <span>またはメールでログイン</span>
                <div className="h-px bg-[#E5E2EE] flex-1" />
              </div>
            </>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* ログインフォーム */}
          {!isRegisterMode && (
            <form onSubmit={handleLoginSubmit} action="#" method="post" autoComplete="on" className="space-y-3" key="login-form">
              <div className="space-y-1">
                <label htmlFor="login-username" className="text-xs font-bold text-[#221C35]">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    name="username"
                    type="email"
                    inputMode="email"
                    autoComplete="username webauthn"
                    value={idOrEmail}
                    onChange={(e) => setIdOrEmail(e.target.value)}
                    placeholder="example@gmail.com"
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
                    autoComplete="current-password webauthn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#221C35] hover:bg-[#3B1F68] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer pt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'ログイン中...' : 'ログインする'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* 新規登録 ステップ1: メールアドレス・パスワード入力 */}
          {isRegisterMode && registerStep === 'form' && (
            <form
              onSubmit={handleRegisterFormSubmit}
              action="#"
              method="post"
              autoComplete="on"
              className="space-y-3"
              key="register-form"
            >
              <div className="space-y-1">
                <label htmlFor="register-email" className="text-xs font-bold text-[#221C35]">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-email"
                    name="username"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={idOrEmail}
                    onChange={(e) => setIdOrEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#857D99] pt-0.5">このアドレス宛に6桁の認証コードを送信します。</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="register-password" className="text-xs font-bold text-[#221C35]">
                  パスワード
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="register-password-confirm" className="text-xs font-bold text-[#221C35]">
                  パスワード（確認用）
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-password-confirm"
                    name="new-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-xs text-[#221C35] outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#857D99] pt-0.5">
                  6文字以上、英大文字・小文字・数字・記号をすべて含めてください。
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#221C35] hover:bg-[#3B1F68] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer pt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? '送信中...' : '認証コードを送信する'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* 新規登録 ステップ2: 認証コード入力 */}
          {showingVerifyStep && (
            <form onSubmit={handleVerifySubmit} className="space-y-3" key="verify-form">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{idOrEmail}</strong> 宛に6桁の認証コードを送信しました。メールをご確認のうえ入力してください。
                </span>
              </div>

              <div className="space-y-1">
                <label htmlFor="register-otp" className="text-xs font-bold text-[#221C35]">
                  認証コード（6桁）
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#857D99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#E5E2EE] focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6] text-sm tracking-[0.3em] font-bold text-[#221C35] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#221C35] hover:bg-[#3B1F68] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? '認証中...' : '認証して登録完了'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterStep('form');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="text-[#857D99] hover:underline cursor-pointer"
                >
                  ← 入力内容を修正する
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="text-[#5B21B6] hover:underline font-bold cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `再送信 (${resendCooldown}秒後)` : 'コードを再送信する'}
                </button>
              </div>
            </form>
          )}

          {/* モード切替 */}
          {!showingVerifyStep && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setRegisterStep('form');
                  setError(null);
                }}
                className="text-xs text-[#5B21B6] hover:underline font-bold cursor-pointer"
              >
                {isRegisterMode ? 'すでにアカウントをお持ちの方（ログイン）' : 'まだ神埼IDをお持ちでない方（新規無料登録）'}
              </button>
            </div>
          )}
        </div>

        {/* フッター規約 */}
        <div className="p-3 bg-[#F8F7FC] border-t border-[#E5E2EE] text-center text-[10px] text-[#857D99]">
          神埼鉄道 NIIZAKI ID 会員規約およびプライバシーポリシーに同意して利用します。
        </div>
      </div>
    </div>
  );
};

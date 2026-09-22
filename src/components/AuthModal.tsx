import React, { useState } from 'react';
import {
  X,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Fingerprint,
  Smartphone,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { UserAccount } from '../types';
import { registerPasskey, authenticateWithPasskey, detectDeviceName } from '../utils/passkeyAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  currentPoints: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentPoints,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // 新規登録ステータス: 'input' -> 'verify' -> 'passkey_prompt' -> 'completed'
  const [registerStep, setRegisterStep] = useState<'input' | 'verify' | 'passkey_prompt'>('input');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string>('582914');
  const [isCodeSent, setIsCodeSent] = useState(false);

  // ログイン入力用
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 状態フラグ
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [temporaryCreatedUser, setTemporaryCreatedUser] = useState<UserAccount | null>(null);

  if (!isOpen) return null;

  // 1. 新規登録：認証コード送信
  const handleSendVerificationCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerEmail.includes('@')) {
      setErrorMessage('有効なメールアドレスを入力してください。');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      // 6桁の認証コードを生成
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setIsCodeSent(true);
      setRegisterStep('verify');
      setIsLoading(false);
    }, 600);
  };

  // 2. 新規登録：認証コード検証 → 本登録完了
  const handleVerifyAndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim() !== sentCode) {
      setErrorMessage('入力された認証コードが一致しません。もう一度お確かめください。');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      // ユーザーアカウントオブジェクトを生成
      const newUserId = `KZ-${Math.floor(100000 + Math.random() * 900000)}`;
      const newUser: UserAccount = {
        id: newUserId,
        email: registerEmail,
        name: registerName || registerEmail.split('@')[0],
        registeredAt: new Date().toLocaleDateString('ja-JP'),
        nPointBalance: currentPoints, // 現在のN-POINTを紐付け
        hasPasskey: false,
        isLineLinked: false,
        twoFactorEnabled: true,
      };

      setTemporaryCreatedUser(newUser);
      setRegisterStep('passkey_prompt');
      setIsLoading(false);
    }, 500);
  };

  // 3. パスキー（Face ID / 生体認証）の登録実行
  const handleSetupPasskey = async () => {
    if (!temporaryCreatedUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await registerPasskey(
        temporaryCreatedUser.id,
        temporaryCreatedUser.email,
        temporaryCreatedUser.name
      );

      if (res.success) {
        const updatedUser: UserAccount = {
          ...temporaryCreatedUser,
          hasPasskey: true,
          passkeyCredentialId: res.credentialId,
          passkeyDeviceName: res.deviceName,
        };
        onLoginSuccess(updatedUser);
        onClose();
      } else {
        setErrorMessage(res.error || 'パスキーの登録が完了しませんでした。');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'パスキーの設定に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. パスキー設定をスキップして完了
  const handleSkipPasskey = () => {
    if (temporaryCreatedUser) {
      onLoginSuccess(temporaryCreatedUser);
      onClose();
    }
  };

  // 5. ログイン：パスキー（Face ID / 生体認証）で認証
  const handleLoginWithPasskey = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authenticateWithPasskey();
      if (res.success) {
        // 保存された既存ユーザー、または新規パスキーユーザーとしてログイン
        const existingData = localStorage.getItem('kanzaki_saved_user');
        let user: UserAccount;
        if (existingData) {
          user = JSON.parse(existingData);
          user.hasPasskey = true;
        } else {
          user = {
            id: `KZ-772819`,
            email: 'passkey.user@kanzaki-rail.jp',
            name: 'パスキー会員',
            registeredAt: '2026/04/01',
            nPointBalance: currentPoints,
            hasPasskey: true,
            passkeyDeviceName: detectDeviceName(),
            isLineLinked: false,
            twoFactorEnabled: true,
          };
        }
        onLoginSuccess(user);
        onClose();
      } else {
        setErrorMessage(res.error || 'パスキー認証に失敗しました。');
      }
    } catch (err: any) {
      setErrorMessage('パスキー認証エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. ログイン：メールアドレスとパスワード
  const handleLoginWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      setErrorMessage('メールアドレスを入力してください。');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const user: UserAccount = {
        id: `KZ-${Math.floor(100000 + Math.random() * 900000)}`,
        email: loginEmail,
        name: loginEmail.split('@')[0],
        registeredAt: new Date().toLocaleDateString('ja-JP'),
        nPointBalance: currentPoints,
        hasPasskey: false,
        isLineLinked: false,
        twoFactorEnabled: true,
      };
      onLoginSuccess(user);
      setIsLoading(false);
      onClose();
    }, 600);
  };

  // 7. LINEでログイン
  const handleLoginWithLine = () => {
    setIsLoading(true);
    setTimeout(() => {
      const user: UserAccount = {
        id: `KZ-LINE-${Math.floor(1000 + Math.random() * 9000)}`,
        email: 'line.connected@kanzaki-rail.jp',
        name: '神埼 太郎 (LINE連携)',
        registeredAt: new Date().toLocaleDateString('ja-JP'),
        nPointBalance: currentPoints,
        hasPasskey: false,
        isLineLinked: true,
        lineUserName: '神埼 太郎',
        twoFactorEnabled: false,
      };
      onLoginSuccess(user);
      setIsLoading(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white text-[#221C35] w-full max-w-md rounded-3xl border border-[#E6E2EE] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#FAF9FD] p-4 border-b border-[#E6E2EE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#5B21B6] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#5B21B6] font-extrabold uppercase tracking-wider">
                神埼鉄道 ID認証
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#221C35]">
                {mode === 'login' ? '神埼アカウント ログイン' : '神埼アカウント 新規会員登録'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#EFE8FA] text-[#6B6380] hover:text-[#221C35] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: ログイン / 新規登録 */}
        <div className="flex border-b border-[#E6E2EE] bg-[#F7F5FA] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#5B21B6] shadow-xs'
                : 'text-[#6B6380] hover:text-[#221C35]'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegisterStep('input');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#5B21B6] shadow-xs'
                : 'text-[#6B6380] hover:text-[#221C35]'
            }`}
          >
            新規会員登録
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ===================== MODE 1: LOGIN ===================== */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* 最優先おすすめ：パスキーログインボタン（Face ID / 生体認証） */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EDE9FE] via-[#F5F3FF] to-[#FAF5FF] border border-[#DDD6FE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#5B21B6] bg-white px-2 py-0.5 rounded-full border border-[#C4B5FD]">
                    おすすめ・最速認証
                  </span>
                  <span className="text-[10px] text-[#6B6380] flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    端末連動
                  </span>
                </div>

                <div className="text-xs text-[#3B2D54]">
                  <p className="font-bold text-sm text-[#221C35]">
                    パスキーでログイン（Face ID / 生体認証）
                  </p>
                  <p className="text-[11px] text-[#6B6380] mt-0.5">
                    パスワード入力不要。iPhoneやAndroid等のパスワードシステムで安全に認証します。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoginWithPasskey}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4 text-amber-300" />
                  <span>パスキーでログインする</span>
                </button>
              </div>

              {/* 区切り線 */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5E2EE]" />
                <span className="shrink mx-3 text-[10px] font-bold text-[#857D99]">
                  または他の方法でログイン
                </span>
                <div className="flex-grow border-t border-[#E5E2EE]" />
              </div>

              {/* メールアドレスでログインフォーム */}
              <form onSubmit={handleLoginWithEmail} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#3B2D54] mb-1">
                    登録メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#857D99] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="example@kanzaki-rail.jp"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D5D0E2] bg-white focus:outline-none focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3B2D54] mb-1">
                    パスワード / 認証情報
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#857D99] absolute left-3 top-3" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="パスワードを入力"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D5D0E2] bg-white focus:outline-none focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#221C35] hover:bg-[#342C4E] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>メールアドレスでログイン</span>
                </button>
              </form>

              {/* LINEでログイン */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleLoginWithLine}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="w-4 h-4 bg-white text-[#06C755] rounded-full flex items-center justify-center font-black text-[10px]">
                    L
                  </span>
                  <span>LINEでかんたんログイン</span>
                </button>
              </div>

              {/* 新規登録へのリンク */}
              <div className="pt-2 text-center text-[11px] text-[#6B6380]">
                アカウントをお持ちでない方は
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegisterStep('input');
                  }}
                  className="ml-1 text-[#5B21B6] font-bold underline cursor-pointer"
                >
                  新規会員登録（無料）
                </button>
              </div>
            </div>
          )}

          {/* ===================== MODE 2: REGISTER ===================== */}
          {mode === 'register' && (
            <div className="space-y-4">
              {/* STEP 1: メールアドレス入力 */}
              {registerStep === 'input' && (
                <form onSubmit={handleSendVerificationCode} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#5B21B6] space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      神埼アカウントを作るとできること
                    </p>
                    <ul className="text-[10px] text-[#6B6380] list-disc list-inside space-y-0.5">
                      <li>保有N-POINTの引き継ぎ・管理（現在の残高が自動連携）</li>
                      <li>特急券・車内デリバリー予約の履歴保持</li>
                      <li>Face ID・Touch IDによる次世代パスキーログイン</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B2D54] mb-1">
                      氏名・ニックネーム
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#857D99] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="神埼 太郎"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D5D0E2] bg-white focus:outline-none focus:border-[#5B21B6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B2D54] mb-1">
                      メールアドレス <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#857D99] absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="passenger@kanzaki-rail.jp"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D5D0E2] bg-white focus:outline-none focus:border-[#5B21B6]"
                      />
                    </div>
                    <p className="text-[10px] text-[#857D99] mt-1">
                      ※このアドレスに6桁の承認コードをお送りします。
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>承認コードを送信</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* STEP 2: 承認コード入力 */}
              {registerStep === 'verify' && (
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  {/* メール受信シミュレーションカード（ユーザー体験を損なわないよう提示） */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded">
                        メール送信完了
                      </span>
                      <span className="text-[10px] text-amber-700">{registerEmail} 宛</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold">【神埼鉄道】ご登録の承認コードのお知らせ</p>
                      <div className="mt-1 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-300">
                        <span className="font-mono text-base font-black tracking-widest text-[#5B21B6]">
                          {sentCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVerificationCode(sentCode)}
                          className="text-[10px] font-bold text-[#5B21B6] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>ワンタップ入力</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3B2D54] mb-1">
                      届いた承認コード（6桁）を入力
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="例: 582914"
                      className="w-full text-center font-mono text-lg font-bold tracking-widest py-2.5 rounded-xl border border-[#D5D0E2] bg-white focus:outline-none focus:border-[#5B21B6]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep('input')}
                      className="py-2.5 px-3 rounded-xl border border-[#D5D0E2] text-[#6B6380] hover:bg-gray-50 font-bold text-xs cursor-pointer"
                    >
                      戻る
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>本登録を完了する</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: 本登録完了 ＆ パスキー設定の推奨ダイアログ */}
              {registerStep === 'passkey_prompt' && (
                <div className="space-y-4 text-center py-2 animate-fadeIn">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-[#221C35]">
                      神埼アカウントの本登録が完了しました！
                    </h4>
                    <p className="text-[11px] text-[#6B6380] mt-1">
                      会員番号: <span className="font-mono font-bold text-[#5B21B6]">{temporaryCreatedUser?.id}</span> / 保有N-POINT: {currentPoints}pt 連携済
                    </p>
                  </div>

                  {/* パスキー推奨カード */}
                  <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#C4B5FD] text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#5B21B6] text-white rounded-lg">
                        <Fingerprint className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#5B21B6]">次回からのかんたんログイン</div>
                        <h5 className="text-xs font-bold text-[#221C35]">
                          Face ID / 生体認証（パスキー）を設定しますか？
                        </h5>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#6B6380] leading-relaxed">
                      端末（iPhone、Mac、Android、Windows等）のパスワードマネージャーと連動し、次回以降はパスワード不要で生体認証のみで即座にサインインできます。
                    </p>

                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleSetupPasskey}
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Fingerprint className="w-4 h-4 text-amber-300" />
                        <span>パスキーを設定する（推奨）</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSkipPasskey}
                        className="w-full py-2 text-[11px] text-[#6B6380] hover:text-[#221C35] font-bold cursor-pointer"
                      >
                        あとで設定する
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

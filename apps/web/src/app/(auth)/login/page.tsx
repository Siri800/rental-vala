'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function getReturnPath(queryValue: string | null): string | null {
  const candidate =
    queryValue || (typeof window !== 'undefined' ? sessionStorage.getItem('rv_intended_redirect') : null);
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return null;
  }
  if (candidate === '/login' || candidate === '/register' || candidate === '/admin/login') return null;
  return candidate;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>('CUSTOMER');
  const [loginMethod, setLoginMethod] = useState<'OTP' | 'PASSWORD'>('OTP');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const finishLogin = (result: {
    data: {
      accessToken: string;
      user: { roles: string[]; fullName: string; email: string; phone: string };
    };
  }) => {
    localStorage.setItem('rv_access_token', result.data.accessToken);
    localStorage.setItem('rv_user', JSON.stringify(result.data.user));
    const redirectPath = getReturnPath(params.get('redirect'));
    sessionStorage.removeItem('rv_intended_redirect');
    router.push(role === 'PROVIDER' ? '/dashboard/provider' : redirectPath || '/');
    router.refresh();
  };

  const handlePasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      const normalizedIdentifier = trimmedIdentifier.includes('@')
        ? trimmedIdentifier.toLowerCase()
        : trimmedIdentifier.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      const result = await apiFetch<{
        data: {
          accessToken: string;
          user: { roles: string[]; fullName: string; email: string; phone: string };
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          password,
          role,
        }),
      });
      finishLogin(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (event?: FormEvent) => {
    event?.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const normalizedPhone = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      const result = await apiFetch<{
        message: string;
        data: { emailHint: string | null };
      }>('/auth/login/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalizedPhone, role }),
      });
      setEmailHint(result.data.emailHint || '');
      setNotice(result.message);
      setStep('OTP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send sign-in code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalizedPhone = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      const result = await apiFetch<{
        data: {
          accessToken: string;
          user: { roles: string[]; fullName: string; email: string; phone: string };
        };
      }>('/auth/login/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalizedPhone, otp, role }),
      });

      finishLogin(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in code verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <Link href="/" className="text-sm font-extrabold tracking-tight text-brand-700">
            RentalVala
          </Link>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
            {loginMethod === 'PASSWORD'
              ? 'Sign in with Password'
              : step === 'PHONE'
                ? 'Welcome Back'
                : 'Verify Your Sign-In'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loginMethod === 'PASSWORD'
              ? 'Sign in using your registered email or mobile number.'
              : step === 'PHONE'
                ? 'Enter your Indian mobile number to receive a secure email OTP.'
                : emailHint
                  ? `Enter the 6-digit code sent to ${emailHint}.`
                  : 'Enter the 6-digit code sent to your registered email address.'}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Sign in as
          </p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose account type">
            <button
              type="button"
              aria-pressed={role === 'CUSTOMER'}
              onClick={() => {
                setRole('CUSTOMER');
                setError('');
              }}
              className={`rounded-xl border p-3 text-left transition ${
                role === 'CUSTOMER'
                  ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
                  : 'border-slate-200 text-slate-700 hover:border-brand-300'
              }`}
            >
              <span className="block font-bold">🛍️ Customer</span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                Rent items &amp; book appointments
              </span>
            </button>
            <button
              type="button"
              aria-pressed={role === 'PROVIDER'}
              onClick={() => {
                setRole('PROVIDER');
                setError('');
              }}
              className={`rounded-xl border p-3 text-left transition ${
                role === 'PROVIDER'
                  ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
                  : 'border-slate-200 text-slate-700 hover:border-brand-300'
              }`}
            >
              <span className="block font-bold">🏪 Provider</span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                List items, manage slots &amp; earnings
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Sign-in method">
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'OTP'}
            onClick={() => {
              setLoginMethod('OTP');
              setError('');
              setStep('PHONE');
            }}
            className={`rounded-lg py-2 text-sm font-bold ${loginMethod === 'OTP' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
          >
            Mobile + Email OTP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'PASSWORD'}
            onClick={() => {
              setLoginMethod('PASSWORD');
              setError('');
            }}
            className={`rounded-lg py-2 text-sm font-bold ${loginMethod === 'PASSWORD' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
          >
            Password
          </button>
        </div>

        {loginMethod === 'PASSWORD' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="mb-1 block text-xs font-semibold text-slate-700">
                Email or Mobile Number
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="name@example.com or 9876543210"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-16 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-brand-600"
                >
                  {passwordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : step === 'PHONE' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-semibold text-slate-700">
                Mobile Number
              </label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(-10))}
                  className="min-w-0 flex-1 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending code...' : 'Send Email OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <label htmlFor="otp" className="mb-1 block text-xs font-semibold text-slate-700">
              6-Digit Email OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg font-bold tracking-[0.4em]"
              placeholder="••••••"
            />
            {notice && <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">{notice}</p>}
            {error && <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('PHONE');
                  setOtp('');
                  setError('');
                  setNotice('');
                }}
                className="font-semibold text-slate-600 hover:text-slate-900"
              >
                Change number
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestOtp()}
                className="font-semibold text-brand-600 hover:underline disabled:text-slate-400"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          New to RentalVala?{' '}
          <Link
            href={`/register?role=${role}${params.get('redirect') ? `&redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`}
            className="font-semibold text-brand-600 hover:underline"
          >
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-slate-500">
          Administrator?{' '}
          <Link href="/admin/login" className="font-semibold text-slate-700 hover:underline">
            Open the Admin portal
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading sign-in...</div>}>
      <LoginForm />
    </Suspense>
  );
}

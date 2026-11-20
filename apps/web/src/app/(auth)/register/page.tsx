'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

const passwordCharacterSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*',
};

function randomIndex(max: number): number {
  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const value = new Uint32Array(1);
  do {
    window.crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % max;
}

function generateStrongPassword(): string {
  const allCharacters = Object.values(passwordCharacterSets).join('');
  const characters = Object.values(passwordCharacterSets).map(
    (characterSet) => characterSet[randomIndex(characterSet.length)]
  );

  while (characters.length < 14) {
    characters.push(allCharacters[randomIndex(allCharacters.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

function getReturnPath(queryValue: string | null): string | null {
  const candidate =
    queryValue || (typeof window !== 'undefined' ? sessionStorage.getItem('rv_intended_redirect') : null);
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return null;
  }
  if (candidate === '/login' || candidate === '/register' || candidate === '/admin/login') return null;
  return candidate;
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>(
    params.get('role') === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER'
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRules = [
    {
      label: 'At least 8 characters',
      missingLabel: 'Use at least 8 characters',
      satisfied: password.length >= 8,
    },
    {
      label: 'At least 1 uppercase letter (A–Z)',
      missingLabel: 'Missing uppercase letter',
      satisfied: /[A-Z]/.test(password),
    },
    {
      label: 'At least 1 lowercase letter (a–z)',
      missingLabel: 'Add at least 1 lowercase letter',
      satisfied: /[a-z]/.test(password),
    },
    {
      label: 'At least 1 number (0–9)',
      missingLabel: 'Add at least 1 number',
      satisfied: /[0-9]/.test(password),
    },
    {
      label: 'At least 1 special character (!@#$%^&*)',
      missingLabel: 'Add a special character (!@#$%^&*)',
      satisfied: /[!@#$%^&*]/.test(password),
    },
  ];
  const satisfiedPasswordRules = passwordRules.filter((rule) => rule.satisfied).length;
  const passwordIsValid = satisfiedPasswordRules === passwordRules.length;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordStrength =
    satisfiedPasswordRules <= 2
      ? { label: 'Weak', color: 'bg-red-500', text: 'text-red-700' }
      : satisfiedPasswordRules <= 4
        ? { label: 'Fair / Medium', color: 'bg-amber-500', text: 'text-amber-700' }
        : { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-700' };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordIsValid) {
      setError('Please meet all password requirements before creating your account.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          role,
          termsAccepted: true,
        }),
      });
      setNotice(`A verification code was sent to ${email}.`);
      setStep('OTP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        data: {
          accessToken: string;
          user: { roles: string[]; fullName: string; email: string; phone: string };
        };
      }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });

      localStorage.setItem('rv_access_token', res.data.accessToken);
      localStorage.setItem('rv_user', JSON.stringify(res.data.user));
      const roles = res.data.user.roles;
      const redirectPath = getReturnPath(params.get('redirect'));
      sessionStorage.removeItem('rv_intended_redirect');
      if (roles.some((userRole) => userRole.includes('ADMIN'))) {
        router.push('/dashboard/admin');
      } else if (roles.includes('PROVIDER')) {
        router.push('/dashboard/provider');
      } else {
        router.push(redirectPath || '/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setNotice(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestPassword = () => {
    setPassword(generateStrongPassword());
    setPasswordFeedback('');
    setError('');
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setPasswordFeedback('Password copied.');
    } catch {
      setPasswordFeedback('Could not access the clipboard. Select and copy the password instead.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {step === 'FORM' ? 'Create Your Rental Vala Account' : 'Verify Your Email'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'FORM'
              ? 'Rent items or list your inventory across India'
              : `Enter the 6-digit code sent to ${email}. If local email is unconfigured, check the API console.`}
          </p>
        </div>

        {step === 'FORM' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Account Type
              </p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose account type">
                <button
                  type="button"
                  aria-pressed={role === 'CUSTOMER'}
                  onClick={() => setRole('CUSTOMER')}
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
                  onClick={() => setRole('PROVIDER')}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                10-Digit Mobile Number
              </label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(-10))}
                  className="min-w-0 flex-1 px-3.5 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordFeedback('');
                  }}
                  aria-describedby="password-strength password-rules"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 pr-16 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-brand-600"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              <div id="password-strength" className="mt-2" aria-live="polite">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Password strength</span>
                  <span className={`font-bold ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Password strength"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={satisfiedPasswordRules}
                >
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(satisfiedPasswordRules / passwordRules.length) * 100}%` }}
                  />
                </div>
              </div>
              <ul id="password-rules" className="mt-2 space-y-1 text-xs" aria-live="polite">
                {passwordRules.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 ${
                      rule.satisfied ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    <span aria-hidden="true">{rule.satisfied ? '✓' : '✗'}</span>
                    <span>{rule.satisfied ? rule.label : rule.missingLabel}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSuggestPassword}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Suggest Strong Password
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  disabled={!password}
                  className="text-xs font-semibold text-brand-600 hover:underline disabled:text-slate-400"
                >
                  Copy
                </button>
                {passwordFeedback && (
                  <span className="text-xs text-slate-600" role="status">
                    {passwordFeedback}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 pr-16 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-brand-600"
                  aria-label={confirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {confirmPasswordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              {confirmPassword && (
                <p
                  className={`mt-1 text-xs font-semibold ${
                    passwordsMatch ? 'text-emerald-700' : 'text-red-600'
                  }`}
                  aria-live="polite"
                >
                  {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading || !passwordIsValid || !passwordsMatch}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest font-bold"
            />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}
            {notice && <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg">{notice}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Verifying...' : 'Verify Email & Continue'}
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full text-sm text-brand-600 font-semibold hover:underline disabled:text-slate-400"
            >
              Resend verification code
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link
            href={`/login${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`}
            className="text-brand-600 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
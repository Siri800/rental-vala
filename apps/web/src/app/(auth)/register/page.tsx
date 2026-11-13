'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>(
    params.get('role') === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER'
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setStep('OTP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        data: { accessToken: string; user: { roles: string[] } };
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: phone, otp, purpose: 'REGISTRATION' }),
      });

      localStorage.setItem('rv_access_token', res.data.accessToken);
      localStorage.setItem('rv_user', JSON.stringify(res.data.user));
      router.push(role === 'PROVIDER' ? '/dashboard/provider' : '/dashboard/customer');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {step === 'FORM' ? 'Create Your Rental Vala Account' : 'Verify Your Mobile OTP'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'FORM'
              ? 'Rent items or list your inventory across India'
              : `Check your VS Code API terminal for the 6-digit OTP sent to ${phone}`}
          </p>
        </div>

        {step === 'FORM' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('CUSTOMER')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  role === 'CUSTOMER' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                I Want to Rent
              </button>
              <button
                type="button"
                onClick={() => setRole('PROVIDER')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  role === 'PROVIDER' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                I Want to List & Earn
              </button>
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
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password (Min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm"
              />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Sending OTP...' : 'Continue & Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="text"
              maxLength={6}
              required
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest font-bold"
            />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Verifying...' : 'Verify & Activate Account'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">
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
'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSuccess(true);
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('forgotPassword')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('forgotPasswordHint')}</p>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm text-center">
          {t('passwordResetSent')}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? tc('loading') : t('sendResetLink')}
          </button>
        </form>
      )}

      <div className="text-center mt-6">
        <Link href="/login" className="text-sm text-green-600 hover:underline">
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}

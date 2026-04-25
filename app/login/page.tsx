\'use client\';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      setSubmitting(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        setError(error.message.includes('Invalid login') ? 'Invalid email or password.' : error.message);
        setSubmitting(false);
        return;
      }
      router.replace('/');
    } else {
      if (!formData.name) { setError('Please enter your name.'); setSubmitting(false); return; }
      const { error } = await signUp(formData.email, formData.password, formData.name);
      if (error) {
        setError(error.message.includes('already registered') ? 'Email already registered. Sign in instead.' : error.message);
        setSubmitting(false);
        return;
      }
      setError('Check your email to confirm your account, then sign in.');
      setIsLogin(true);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden flex-col justify-center px-16">
        <div className="absolute inset-0 bg-blue-900/10" />
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white">DiscoveryLens</h1>
            <p className="text-blue-400 text-sm mt-1 uppercase tracking-widest">by CaseBuddy</p>
          </div>
          <p className="text-gray-300 text-lg leading-relaxed max-w-sm">
            AI-powered legal discovery analysis. Upload, annotate, and analyze discovery files — connected to your CaseBuddy account.
          </p>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Same account as CaseBuddy / case-companion
            </div>
            <div className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Documents synced to shared database
            </div>
            <div className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Azure AI OCR + analysis
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-white">DiscoveryLens</h1>
            <p className="text-blue-400 text-xs mt-1">by CaseBuddy</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-1">
              {isLogin ? 'Sign in to DiscoveryLens' : 'Create your account'}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {isLogin ? 'Use your CaseBuddy credentials' : 'Works across all CaseBuddy apps'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Full name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Jane Smith"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="you@lawfirm.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div className={`text-sm px-3 py-2 rounded-lg ${error.includes('Check your email') ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
              >
                {submitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsLogin(p => !p); setError(null); }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {isLogin ? "Don\'t have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

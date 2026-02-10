


import React, { useState } from 'react';

import { useAuth } from './AuthContext';

import { useLocalization } from '@/i18n/LocalizationContext';
import Dither from '@/components/shared/Dither';
import SpotlightCard from '@/components/shared/SpotlightCard';

const LoginScreen: React.FC = () => {

  const { login, loading, error } = useAuth();

  const { t } = useLocalization();

  const translate = (key: string, fallback: string) => {

    const value = t(key);

    return value === key ? fallback : value;

  };

  const [username, setUsername] = useState('');

  const [password, setPassword] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {

    event.preventDefault();

    setLocalError(null);

    try {

      await login(username, password);

    } catch (err) {

      setLocalError(err instanceof Error ? err.message : translate('error_login_failed', 'Login failed'));

    }

  };

    return (

      <div className="relative min-h-screen p-6 overflow-hidden">

        <div className="fixed inset-0 -z-10">
          <Dither
            waveSpeed={0.03}
            waveFrequency={3}
            waveAmplitude={0.3}
            waveColor={[0.8, 0.1, 0.1]}
            colorNum={4}
            pixelSize={2}
            disableAnimation={false}
            enableMouseInteraction={true}
            mouseRadius={1}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">

        <div className="text-center mb-6">

          <img src="/logo.png" alt="Logo" className="mx-auto h-72" />

        </div>

        <SpotlightCard
          className="w-full max-w-md bg-black/40 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/10 p-8 space-y-6"
          spotlightColor="rgba(239, 68, 68, 0.15)"
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-white">Hello there</h1>
            <p className="text-sm text-white/50">{translate('login_subtitle', 'Enter your credentials to continue')}</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1" htmlFor="username">
                {translate('login_username_label', 'Username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1" htmlFor="password">
                {translate('login_password_label', 'Password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                autoComplete="current-password"
                required
              />
            </div>
            {(localError || error) && (
              <div className="text-sm text-red-300 bg-red-900/40 border border-red-500/30 rounded-lg px-3 py-2">
                {localError || error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? translate('login_button_loading', 'Signing in...') : translate('login_button', 'Sign in')}
            </button>
          </form>
        </SpotlightCard>

      </div>

    </div>

  );

};



export default LoginScreen;

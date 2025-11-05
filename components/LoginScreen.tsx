


import React, { useState, useRef, useLayoutEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';

import { useLocalization } from '../contexts/LocalizationContext';

import DitherGlowR3F from './shaders/DitherGlowR3F';



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



  const boxRef = useRef<HTMLDivElement>(null);

  const [boxRect, setBoxRect] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);



  useLayoutEffect(() => {

    const updateRect = () => {

      if (boxRef.current) {

        const rect = boxRef.current.getBoundingClientRect();

        const y = window.innerHeight - rect.bottom;

        setBoxRect({ x: rect.left, y: y, width: rect.width, height: rect.height });

      }

    };



    updateRect();

    window.addEventListener('resize', updateRect);

    return () => window.removeEventListener('resize', updateRect);

  }, []);



  const handleSubmit = async (event: React.FormEvent) => {

    event.preventDefault();

    setLocalError(null);

    try {

      await login(username, password);

    } catch (err) {

      setLocalError(err instanceof Error ? err.message : translate('error_login_failed', 'Login failed'));

    }

  };



  const glowColor: [number, number, number] = [0.86, 0.15, 0.15];



  return (

    <div className="relative min-h-screen bg-white p-6 overflow-hidden">

      {boxRect && (

        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>

          <DitherGlowR3F 

            pixelSize1={1}

            pixelSize2={1}

            pixelSize3={1}

            glitchAmount={0.0}

            animate={true}

            boxRect={boxRect}

            glowColor={glowColor}

          />

        </div>

      )}



      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">

        <div className="text-center mb-6">

          <img src="/logo.png" alt="Logo" className="mx-auto h-72" />

        </div>



        <div ref={boxRef} className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-red-100 p-8 space-y-6">

          <div className="text-center space-y-2">

            <h1 className="text-2xl font-semibold text-red-700">Hello there</h1>

            <p className="text-sm text-red-500/80">{translate('login_subtitle', 'Enter your credentials to continue')}</p>

          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">

                {translate('login_username_label', 'Username')}

              </label>

              <input

                id="username"

                type="text"

                value={username}

                onChange={(event) => setUsername(event.target.value)}

                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"

                autoComplete="username"

                required

              />

            </div>

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">

                {translate('login_password_label', 'Password')}

              </label>

              <input

                id="password"

                type="password"

                value={password}

                onChange={(event) => setPassword(event.target.value)}

                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"

                autoComplete="current-password"

                required

              />

            </div>

            {(localError || error) && (

              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">

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

        </div>

      </div>

    </div>

  );

};



export default LoginScreen;


import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  getMyProfile,
  loginAccount,
  registerAccount,
} from './api';
import type { AuthSession } from './api';

import './auth.css';

interface LoginPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'register';

export default function LoginPage({
  onAuthenticated,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isRegister = mode === 'register';

  function changeMode(next: AuthMode) {
    setMode(next);
    setError('');
    setSuccess('');
    setPassword('');
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegister) {
        if (password.length < 12) {
          throw new Error(
            'Password minimal 12 karakter.',
          );
        }

        await registerAccount({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
        });

        setMode('login');
        setPassword('');
        setSuccess(
          'Akun berhasil dibuat',
        );

        return;
      }

      const result = await loginAccount(
        email.trim(),
        password,
      );

      // Pastikan token benar-benar dapat
      // digunakan untuk mengambil profil.
      const profile = await getMyProfile(result.token);

      onAuthenticated({
        token: result.token,
        profile,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wd-auth-page">
      <div className="wd-auth-layout">
        <section className="wd-auth-intro">
          <div className="wd-auth-brand">
            <span className="wd-auth-brand-icon">W</span>
            <span>WaifuDesk</span>
          </div>

          <div className="wd-auth-intro-content">
            <span className="wd-auth-eyebrow">
              SATU TEMPAT UNTUK DEVELOPER
            </span>

            <h1>
              WAIFU
              <span>DESK</span>
            </h1>
          </div>

          <div className="wd-auth-intro-footer">
            React · TypeScript · Tauri · Rust
          </div>
        </section>

        <section className="wd-auth-panel">
          <div className="wd-auth-card">
            <div className="wd-auth-mobile-brand">
              WaifuDesk
            </div>

            <div className="wd-auth-card-heading">
              <span className="wd-auth-eyebrow">
                {isRegister
                  ? 'BUAT AKUN'
                  : 'SELAMAT DATANG'}
              </span>

              <h2>
                {isRegister
                  ? 'Daftar WaifuDesk'
                  : 'Masuk ke WaifuDesk'}
              </h2>

              <p>
                {isRegister
                  ? 'Buat akun untuk mulai menggunakan dashboard'
                  : 'Masukkan email dan password akun kamu'}
              </p>
            </div>

            <form
              className="wd-auth-form"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              {isRegister && (
                <label className="wd-auth-field">
                  <span>Nama</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Nama pengguna"
                    required
                    disabled={loading}
                  />
                </label>
              )}

              <label className="wd-auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  maxLength={254}
                  autoComplete="username"
                  placeholder="nama@example.com"
                  required
                  disabled={loading}
                />
              </label>

              <label className="wd-auth-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={isRegister ? 12 : undefined}
                  maxLength={128}
                  autoComplete={
                    isRegister
                      ? 'new-password'
                      : 'current-password'
                  }
                  placeholder="Masukkan password"
                  required
                  disabled={loading}
                />
              </label>

              {isRegister && (
                <p className="wd-auth-hint">
                  Gunakan password minimal 12 karakter
                </p>
              )}

              {error && (
                <p
                  className="wd-auth-message wd-auth-error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  className="wd-auth-message wd-auth-success"
                  role="status"
                >
                  {success}
                </p>
              )}

              <button
                className="wd-auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Memproses...'
                  : isRegister
                    ? 'Buat Akun'
                    : 'Masuk'}
              </button>
            </form>

            <div className="wd-auth-switch">
              <span>
                {isRegister
                  ? 'Sudah punya akun?'
                  : 'Belum punya akun?'}
              </span>

              <button
                type="button"
                onClick={() =>
                  changeMode(
                    isRegister ? 'login' : 'register',
                  )
                }
                disabled={loading}
              >
                {isRegister ? 'Masuk' : 'Daftar'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { Alert, Brand, Field } from '../components/UI';
import { api, csrf, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
export function AuthPage({ mode }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const titles = {
    login: 'Welcome back.',
    register: 'Your next chapter starts here.',
    forgot: 'Let’s get you back in.',
    reset: 'A fresh start.',
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await csrf();
      const response = await api.post(
        `/auth/${{ login: 'login', register: 'register', forgot: 'forgot-password', reset: 'reset-password' }[mode]}`,
        { ...values, token: params.get('token') },
      );
      if (mode === 'login' || mode === 'register') {
        setUser(response.data);
        const from = location.state?.from;
        navigate(
          typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
            ? from
            : response.data.role === 'admin'
              ? '/admin'
              : '/dashboard',
          { replace: true },
        );
      } else setSuccess(response.data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow">PREPARE WITH PURPOSE</span>
          <h1>
            Big ambitions.
            <br />
            Small, consistent
            <br />
            <em>steps.</em>
          </h1>
          <p>
            A dedicated space to build confidence for your MRCEM journey, around the life you
            already lead.
          </p>
          <ul>
            {[
              'Focused courses for every stage',
              'Practice that fits around your shifts',
              'Clear feedback to guide your next step',
            ].map((t) => (
              <li key={t}>
                <Check size={17} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <span className="auth-caption">YOUR NEXT MILESTONE IS WITHIN REACH.</span>
        <div className="auth-orbit" />
      </aside>
      <main className="auth-form-area">
        <Link to="/" className="text-link">
          <ArrowLeft size={16} />
          Back to home
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">MISSION MRCEM</span>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === 'login'
              ? 'Sign in and pick up where you left off.'
              : mode === 'register'
                ? 'Create your account and find your first course.'
                : 'Enter your details below to reset your password.'}
          </p>
          <Alert message={error} />
          <Alert message={success} success />
          <form onSubmit={submit} key={mode}>
            {mode === 'register' && (
              <Field label="Full name">
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Dr. Alex Morgan"
                  maxLength={100}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                defaultValue={params.get('email') || ''}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
            {mode !== 'forgot' && (
              <>
                <Field
                  label={mode === 'reset' ? 'New password' : 'Password'}
                  hint={
                    mode !== 'login'
                      ? 'At least 10 characters, including a letter and a number.'
                      : undefined
                  }
                >
                  <div className="password-field">
                    <input
                      name="password"
                      type={show ? 'text' : 'password'}
                      required
                      minLength={mode === 'login' ? 1 : 10}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={show ? 'Hide password' : 'Show password'}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                {mode !== 'login' && (
                  <Field label="Confirm password">
                    <input
                      name="password_confirmation"
                      type="password"
                      required
                      minLength={10}
                      autoComplete="new-password"
                      placeholder="Enter it once more"
                    />
                  </Field>
                )}
              </>
            )}
            {mode === 'login' && (
              <Link className="forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            )}
            <button className="btn btn-dark btn-full" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'register'
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : 'Reset password'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                New to Mission MRCEM? <Link to="/register">Create an account</Link>
              </>
            ) : mode === 'register' ? (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <Link to="/login">Back to sign in</Link>
            )}
          </p>
          <div className="auth-secure">A little learning today. A more confident tomorrow.</div>
        </div>
      </main>
    </div>
  );
}

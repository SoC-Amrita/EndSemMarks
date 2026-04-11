import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ onLoginComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) {
        setError('Database connection error. Check configuration.');
        return;
    }
    
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      onLoginComplete(session);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-copy">
          <div className="auth-kicker">Faculty Access</div>
          <h1>Marks Portal</h1>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <label className="auth-field">
            <span>Faculty Email</span>
            <input
              type="email"
              placeholder="name@am.amrita.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

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
        setError('Supabase client is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
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
      // Refresh the session gracefully
      const { data: { session } } = await supabase.auth.getSession();
      onLoginComplete(session);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data?.session) {
         onLoginComplete(data.session);
      } else {
         setError("Registration successful! (If you are stuck here, you forgot to disable 'Confirm Email' in Supabase!)");
         setLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <div style={{ padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '500px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', margin: '0 0 20px 0' }}>Marks Portal Secure Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Faculty Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
          {error && <div style={{ color: 'red', fontSize: '13px', textAlign: 'left', fontWeight: 'bold' }}>{error}</div>}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ flex: 1, padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            >
              Sign In
            </button>
            <button 
              type="button" 
              onClick={handleRegister}
              disabled={loading}
              style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

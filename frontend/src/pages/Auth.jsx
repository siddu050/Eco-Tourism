import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

const Auth = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await loginUser(username, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        setUser({ username: data.username });
        navigate(location.state?.from || '/');
      } else {
        await registerUser(username, email, password);
        const data = await loginUser(username, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        setUser({ username: data.username });
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-intro">
        <p className="section-eyebrow">Member Access</p>
        <h1>Save trips, reserve stays, and keep planning from one place.</h1>
        <p className="section-copy">
          The new multi-page experience keeps the booking flow simple while giving signed-in travelers a more premium feel.
        </p>
      </div>

      <div className="auth-card">
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>

        {error && <div className="alert-card">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input-field"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="johndoe"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input-field"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="john@example.com"
              />
            </div>
          )}

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <div className="auth-switch">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Auth;

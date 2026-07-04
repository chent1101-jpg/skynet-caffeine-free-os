import { useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('hermes_token'));

  function handleLogin(t) {
    localStorage.setItem('hermes_token', t);
    setToken(t);
  }

  function handleLogout() {
    localStorage.removeItem('hermes_token');
    setToken(null);
  }

  if (!token) return <Login onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}

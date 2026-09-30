import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ClientList from './pages/ClientList';
import AddClient from './pages/AddClient';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="topbar">
          <div className="brand">
            <span className="dot" />
            <h1>SEO Command Center</h1>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
        <main>
          <Routes>
            <Route path="/" element={<ClientList />} />
            <Route path="/add" element={<AddClient />} />
            <Route path="/dashboard/:clientId" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './lib/Layout';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Billing } from './pages/Billing';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { Reservations } from './pages/Reservations';
import Roles from './pages/Roles';
import { CustomerPortal } from './pages/CustomerPortal';
import { Settings } from './pages/Settings';
import { Registration } from './pages/Registration';
import { useAuth } from './lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, logout, isLoading } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [selectedOrg, setSelectedOrg] = useState('Trisha Library,G2 Library');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };


  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/login" element={<Login darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />} />
          
          <Route path="/app" element={
            !user ? (
              <Navigate to="/" replace />
            ) : (
              <Layout 
                user={user}
                onLogout={logout}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                selectedOrg={selectedOrg}
                setSelectedOrg={setSelectedOrg}
              />
            )
          }>
            <Route index element={<Navigate to={user?.role === 'customer' ? 'portal' : 'dashboard'} replace />} />
            <Route path="portal" element={<CustomerPortal />} />
            <Route path="dashboard" element={<Dashboard user={user} selectedOrg={selectedOrg} />} />
            <Route path="reservations" element={<Navigate to="/app/customers" replace />} />
            <Route path="customers" element={<Customers user={user} selectedOrg={selectedOrg} />} />
            <Route path="billing" element={<Billing user={user} selectedOrg={selectedOrg} />} />
            <Route path="roles" element={<Roles />} />
            <Route path="notifications" element={
              user?.role === 'customer' ? (
                <Navigate to="/app/portal" replace />
              ) : (
                <Notifications user={user} selectedOrg={selectedOrg} />
              )
            } />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

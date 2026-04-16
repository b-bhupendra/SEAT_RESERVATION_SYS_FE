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
import { useAuth } from './lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, logout, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [selectedOrg, setSelectedOrg] = useState('All Organizations');

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

  // Automatically update tab if permissions change or on initial load
  useEffect(() => {
    if (!user) return;
    
    // Check if user has permission string (simple helper since we don't have the context function here)
    const hasPerm = (p: string) => user.permissions === '*' || user.permissions?.split(',').includes(p);

    if (hasPerm('view_portal') && currentTab !== 'portal' && currentTab !== 'notifications') {
      setCurrentTab('portal');
    } else if (!hasPerm('view_dashboard') && currentTab === 'dashboard') {
      // If they can't see dashboard but are on it, move them to something they CAN see
      if (hasPerm('manage_customers')) setCurrentTab('customers');
      else if (hasPerm('manage_reservations')) setCurrentTab('reservations');
    }
  }, [user, currentTab]);

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
          <Route path="/app/*" element={
            !user ? (
              <Login darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
            ) : (
              <Layout 
                user={user}
                currentTab={currentTab} 
                setCurrentTab={setCurrentTab}
                onLogout={logout}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                selectedOrg={selectedOrg}
                setSelectedOrg={setSelectedOrg}
              >
                {currentTab === 'portal' && <CustomerPortal />}
                {currentTab === 'dashboard' && <Dashboard user={user} selectedOrg={selectedOrg} />}
                {currentTab === 'reservations' && <Reservations user={user} selectedOrg={selectedOrg} />}
                {currentTab === 'customers' && <Customers user={user} selectedOrg={selectedOrg} />}
                {currentTab === 'billing' && <Billing user={user} selectedOrg={selectedOrg} />}
                {currentTab === 'roles' && <Roles />}
                {currentTab === 'notifications' && <Notifications user={user} selectedOrg={selectedOrg} />}
              </Layout>
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

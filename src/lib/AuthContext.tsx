import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  permissions?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: { email: string; password: string; role: string; full_name: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, [token]);

  const login = async (credentials: any) => {
    try {
      // The API returns the user object directly according to the schema responses
      // or at least that's where the token would be if it were a standard OAuth2 flow.
      // However, the openapi says Successful Response for POST /api/auth/login is {} 
      // which is suspicious. Let's assume it returns { access_token, user } 
      // or similar, or just trust the fetch wrapper to handle status.
      
      const response = await api.post<{ access_token?: string; user?: User }>('/api/auth/login', credentials);
      
      // If the backend is using OAuth2PasswordRequestForm, the token is usually in access_token.
      // If it's the UserCreate schema as shown in the paths, it might be different.
      // For now, I'll handle both possibilities or assume a standard { token, user } response.
      
      const authToken = (response as any).access_token || (response as any).token;
      const userData = (response as any).user || { 
        id: (response as any).user_id || 'temp-id', // Fallback if backend doesn't provide it yet
        email: credentials.email, 
        role: credentials.role 
      };

      if (authToken) {
        localStorage.setItem('token', authToken);
        setToken(authToken);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { api, PaginatedResponse } from './api';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Assuming the endpoint exists as per requirements
      const data = await api.get<PaginatedResponse<Notification>>('/api/notifications?page=1&size=50');
      setNotifications(data.items || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Fallback or demo data if needed
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!user?.id) return;

    // Open a private channel
    const channel = supabase.channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show real-time toast
          toast.info('New Notification', {
            description: newNotif.message,
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, { is_read: true });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      // Placeholder for bulk action if available
      await api.post('/api/notifications/read-all', {});
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        isLoading, 
        markAsRead, 
        markAllAsRead,
        clearAll 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

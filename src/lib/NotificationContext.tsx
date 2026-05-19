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

  const fetchHistory = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    try {
      const data = await api.get<PaginatedResponse<Notification>>('/api/notifications?page=1&size=50');
      
      setNotifications(prev => {
        const prevItems = prev || [];
        const newItems = data.items || [];
        
        // Find newly arrived notifications by checking ID set intersection
        const prevIds = new Set(prevItems.map(n => n.id));
        const arrivedNotifs = newItems.filter(n => !prevIds.has(n.id));
        
        // Emulate real-time toast for background-polled new items
        if (isBackground && arrivedNotifs.length > 0) {
          arrivedNotifs.forEach(newNotif => {
            toast.info('New Notification', {
              description: newNotif.message,
              duration: 5000,
            });
          });
        }
        return newItems;
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user]);

  // Handle initial page load and automatic periodic background polling
  useEffect(() => {
    fetchHistory(false); // Initial load (shows spinner)

    const interval = setInterval(() => {
      fetchHistory(true); // Silent background polling
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Keep Supabase Real-Time Channel as best-effort
  useEffect(() => {
    if (!user?.id) return;

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
          setNotifications(prev => {
            const prevIds = new Set(prev.map(n => n.id));
            if (prevIds.has(newNotif.id)) return prev;
            
            toast.info('New Notification', {
              description: newNotif.message,
              duration: 5000,
            });
            return [newNotif, ...prev];
          });
        }
      )
      .subscribe();

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

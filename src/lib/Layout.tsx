import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Users, Receipt, Bell, LogOut, 
  Menu, ChevronLeft, ChevronRight, Moon, Sun,
  CalendarDays, Settings, ShieldCheck, Hexagon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { useNotifications } from './NotificationContext';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export function Layout({ 
  onLogout, darkMode, onToggleDarkMode, selectedOrg, setSelectedOrg, user
}: { 
  onLogout: () => void,
  darkMode: boolean,
  onToggleDarkMode: () => void,
  selectedOrg: string,
  setSelectedOrg: (org: string) => void,
  user: any
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [allOrgsList, setAllOrgsList] = useState<string[]>(['Trisha Library', 'G2 Library']);

  useEffect(() => {
    if (user.role !== 'customer') {
      api.get<any>('/api/settings').then(res => {
        if (res.organizations_config) {
          try {
            const config = JSON.parse(res.organizations_config);
            setAllOrgsList(Object.keys(config));
          } catch (e) {
            console.error("Failed to parse organizations config", e);
          }
        }
      }).catch(console.error);
    }
  }, [user.role]);
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const hasPermission = (required: string) => {
    if (!user) return false;
    if (user.role === 'admin' || (user as any).permissions === '*') return true;
    if (!(user as any).permissions) return false;
    const perms = (user as any).permissions.split(',').map((p: string) => p.trim());
    const reqs = required.split(',').map((p: string) => p.trim());
    return reqs.some(r => perms.includes(r) || perms.includes('all'));
  };

  const navigation = [
    { name: 'My Portal', id: 'portal', icon: <LayoutDashboard className="h-4 w-4" />, permission: 'view_portal', hideForAdmin: true },
    { name: 'Dashboard', id: 'dashboard', icon: <LayoutDashboard className="h-4 w-4" />, permission: 'view_dashboard' },
    { name: 'Customer Reservations', id: 'customers', icon: <Users className="h-4 w-4" />, permission: 'manage_customers,manage_reservations' },
    { name: 'Billing', id: 'billing', icon: <Receipt className="h-4 w-4" />, permission: 'view_billing' },
    { name: 'Roles', id: 'roles', icon: <ShieldCheck className="h-4 w-4" />, permission: 'manage_roles' },
    { name: 'Notifications', id: 'notifications', icon: <Bell className="h-4 w-4" />, permission: 'view_notifications', hideForCustomer: true },
    { name: 'Settings', id: 'settings', icon: <Settings className="h-4 w-4" />, permission: 'manage_roles' }, // Require admin-level
  ].filter(item => hasPermission(item.permission) && 
                   (!item.hideForAdmin || user.role !== 'admin') &&
                   (!item.hideForCustomer || user.role !== 'customer'));


  const formatNotifDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isValid(date) ? format(date, 'MMM d, h:mm a') : 'Just now';
    } catch {
      return 'Just now';
    }
  };

  const headerBellSection = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            unreadCount > 0 ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-destructive text-[10px] animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0 border-white/20 bg-white/10 backdrop-blur-xl dark:bg-black/20 overflow-hidden shadow-2xl"
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <span className="font-bold text-sm tracking-tight">Notifications</span>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-[10px] uppercase font-bold text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className={cn(
                  "p-4 border-b border-white/5 last:border-0 flex flex-col items-start gap-1 cursor-pointer transition-colors",
                  !notif.is_read ? "bg-primary/5 hover:bg-primary/10" : "opacity-70 hover:bg-white/5"
                )}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="flex w-full justify-between items-start">
                  <span className="font-bold text-sm truncate pr-2">
                    {notif.is_read ? 'System Update' : 'New Notification'}
                  </span>
                  {!notif.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                </div>
                <p className="text-xs text-foreground/80 leading-tight line-clamp-2">
                  {notif.message}
                </p>
                <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                  {formatNotifDate(notif.sent_at)}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">No new notifications</p>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          className="w-full text-xs font-bold py-3 hover:bg-white/5 rounded-none border-t border-white/10" 
          onClick={() => navigate('/app/notifications')}
        >
          View All History
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className={cn(
        "flex items-center h-16 px-6 border-b border-border transition-all duration-300",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {isCollapsed ? (
          <Hexagon className="h-6 w-6 text-primary shrink-0" />
        ) : (
          <div className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-primary shrink-0" />
            <span className="font-extrabold text-xl text-primary tracking-tighter truncate">LUMINA PRO</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-4">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-muted/50",
          isCollapsed ? "justify-center" : ""
        )}>
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarFallback>{user?.role?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold capitalize truncate">{user?.role || 'User'}</span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 py-4">
        {navigation.map((item) => {
          return (
            <NavLink
              key={item.id}
              to={`/app/${item.id}`}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed ? "justify-center" : ""
              )}
            >
              <div className={cn(
                "transition-transform",
                location.pathname === `/app/${item.id}` ? "scale-110" : "group-hover:scale-110"
              )}>
                {item.icon}
              </div>
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center p-0"
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black text-white font-mono select-none antialiased">
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "hidden md:block transition-all duration-300 ease-in-out border-r border-border/40",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/40 bg-black/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-none bg-black text-white">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {user.role !== 'customer' && (() => {
              const ALL_ORGS = allOrgsList;
              const selectedOrgs = selectedOrg
                ? selectedOrg.split(',').map(o => o.trim()).filter(Boolean)
                : [];
              const unselectedOrgs = ALL_ORGS.filter(o => !selectedOrgs.includes(o));
              
              return (
                <div className="flex flex-wrap items-center gap-2 max-w-[500px]">
                  {selectedOrgs.map(org => (
                    <Badge 
                      key={org} 
                      variant="secondary" 
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2 py-1 gap-1 text-sm font-mono flex items-center font-bold"
                    >
                      <span>{org}</span>
                      {selectedOrgs.length > 1 && (
                        <button 
                          onClick={() => {
                            const updated = selectedOrgs.filter(o => o !== org);
                            setSelectedOrg(updated.join(','));
                          }}
                          className="hover:text-red-400 font-extrabold text-xs ml-1 focus:outline-none"
                          title={`Deselect ${org}`}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                  {unselectedOrgs.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 border border-dashed border-white/30 text-white/70 hover:text-white hover:bg-white/10 px-2 text-xs font-mono font-bold"
                        >
                          + Add Library
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-black text-white border-white/20 font-mono">
                        {unselectedOrgs.map(org => (
                          <DropdownMenuItem 
                            key={org} 
                            onClick={() => {
                              const updated = [...selectedOrgs, org];
                              setSelectedOrg(updated.join(','));
                            }}
                            className="hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white"
                          >
                            {org}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })()}
            {user.role === 'customer' && (
              <span className="font-bold text-lg px-3 text-white font-mono">Lumina Portal</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {headerBellSection}

            <Button variant="ghost" size="icon" onClick={onToggleDarkMode} className="text-white hover:bg-white/10">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Avatar className="h-8 w-8 cursor-pointer border-2 border-primary ring-2 ring-primary/20" onClick={onLogout}>
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono font-bold">
                {user?.role?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar (Telemetry Aesthetic) */}
        <nav className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/20 md:hidden font-mono",
          "pb-[env(safe-area-inset-bottom)] h-[calc(4.5rem+env(safe-area-inset-bottom))]",
          "flex items-center justify-around px-1"
        )}>
          {navigation.map((item) => {
            return (
              <NavLink
                key={item.id}
                to={`/app/${item.id}`}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-all",
                  isActive ? "text-primary border-t-2 border-primary -mt-[1px]" : "text-muted-foreground opacity-60"
                )}
              >
                {item.icon}
                <span className="text-[9px] font-mono tracking-tighter mt-1 font-bold truncate max-w-[55px]">
                  {item.name.replace('Notifications', 'LOGS').replace('Reservations', 'RES').replace('Customer Reservations', 'CRM').replace('Customers & Bookings', 'CRM').replace('Customers', 'CRM').replace('Dashboard', 'SYS').replace('Billing', 'LEDG')}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

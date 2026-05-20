import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Users, Receipt, Bell, LogOut, 
  Menu, ChevronLeft, ChevronRight, Moon, Sun,
  CalendarDays, Settings, ShieldCheck, Hexagon,
  LayoutGrid
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
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const activeNavItem = navigation.find(item => location.pathname === `/app/${item.id}`);
  const activeTabName = activeNavItem ? activeNavItem.name : 'DASHBOARD';

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsNavExpanded(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsNavExpanded(false);
      }, 300);
    }
  };

  const handleTabClick = () => {
    if (!window.matchMedia('(hover: hover)').matches) {
      setIsNavExpanded(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans select-none antialiased">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/40 bg-black/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            {/* Brand Logo */}
            <div className="flex items-center gap-2 mr-2">
              <Hexagon className="h-6 w-6 text-primary shrink-0 animate-pulse" />
              <span className="font-extrabold text-xl text-primary tracking-tighter truncate font-mono">LUMINA PRO</span>
            </div>

            {/* Org Selector */}
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer border-2 border-primary ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono font-bold">
                    {user?.role?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black text-white border-white/20 font-mono w-56">
                <DropdownMenuLabel className="font-bold text-xs opacity-70 truncate px-2 py-1.5">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => navigate('/app/settings')} className="hover:bg-white/10 cursor-pointer flex items-center gap-2 text-sm py-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Personal Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={onLogout} className="hover:bg-red-500/10 cursor-pointer text-destructive focus:text-destructive flex items-center gap-2 text-sm py-2">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Collapsible Horizontal Navigation Toggle Bar & Drawer */}
        <div 
          className="relative z-20"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Collapsible Horizontal Navigation Toggle Bar */}
          <div className="h-10 bg-card/60 border-b border-border/40 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">SYSTEM HUB</span>
              <span className="text-muted-foreground/45">/</span>
              <span className="text-primary font-bold uppercase tracking-wider">{activeTabName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNavExpanded(!isNavExpanded)}
              className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-white hover:bg-white/10 gap-1.5 focus:ring-0 focus-visible:ring-0 h-7"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {isNavExpanded ? 'Collapse Tabs' : 'Choose Tab'}
            </Button>
          </div>

          {/* Collapsible Horizontal Bento Grid Drawer */}
          <AnimatePresence initial={false}>
            {isNavExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 top-full overflow-hidden bg-black/95 border-b border-border/40 origin-top shadow-2xl z-50"
              >
                <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto">
                  <div className="grid grid-cols-3 md:flex md:flex-wrap md:justify-center gap-3">
                {navigation.map((item) => {
                  const isActive = location.pathname === `/app/${item.id}`;
                  return (
                    <NavLink
                      key={item.id}
                      to={`/app/${item.id}`}
                      onClick={handleTabClick}
                      className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 text-center cursor-pointer group aspect-square",
                        "w-full md:w-32 md:h-32",
                        isActive 
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-lg shadow-primary/10" 
                          : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/30 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "transition-transform group-hover:scale-110",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                      )}>
                        {item.icon}
                      </div>
                      <span className="text-[9px] font-black uppercase mt-3 tracking-widest truncate max-w-full">
                        {item.name.replace('Customer Reservations', 'CRM').replace('Notifications', 'Logs').replace('Dashboard', 'Sys').replace('Billing', 'Billing').replace('Settings', 'Config')}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </div>

        <main className="flex-1 p-4 md:p-8 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8 animate-fade-in">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
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

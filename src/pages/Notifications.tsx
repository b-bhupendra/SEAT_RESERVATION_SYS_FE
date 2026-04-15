import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Bell, CheckCircle2, MoreVertical, Loader2, User as UserIcon, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api, PaginatedResponse } from "@/lib/api";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const notificationSchema = z.object({
  customer_id: z.string().min(1, "Please select a recipient."),
  message: z.string().min(1, "Message cannot be empty."),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface Notification {
  id: string;
  customer_id: string;
  customer_name: string;
  message: string;
  sent_at: string;
  is_read: boolean;
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

import { useNotifications } from '@/lib/NotificationContext';

export function Notifications({ selectedOrg, user }: { selectedOrg?: string, user: User }) {
  const { notifications: contextNotifications, markAsRead: contextMarkAsRead } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchCust, setSearchCust] = useState('');

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      customer_id: "",
      message: "",
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get<PaginatedResponse<Notification>>(`/api/notifications?page=${page}&size=${pageSize}`);
      setNotifications(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownCustomers = async () => {
    if (!searchCust) return;
    try {
      const custData = await api.get<PaginatedResponse<Customer>>(`/api/customers?page=1&size=500&search=${encodeURIComponent(searchCust)}`);
      setCustomers(custData.items);
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  // Real-time synchronization: When context receives a new notification, refresh the first page of history
  useEffect(() => {
    if (contextNotifications.length > 0 && page === 1) {
      fetchData();
    }
  }, [contextNotifications]);

  useEffect(() => {
    const t = setTimeout(fetchDropdownCustomers, 300);
    return () => clearTimeout(t);
  }, [searchCust]);

  const markAsRead = async (id: string) => {
    try {
      await contextMarkAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {}
  };

  const onSubmit = async (data: NotificationFormValues) => {
    try {
      await api.post('/api/notifications', {
        ...data,
        customer_id: data.customer_id // backend now handles conversion
      });
      setShowAdd(false);
      form.reset();
      fetchData();
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Broadcast updates and reminders to your customers.</p>
        </div>
        {user.role !== 'staff' && (
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Send className="h-4 w-4" /> Send Notification
          </Button>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>
              Write a personalized message for your customer.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Search</FormLabel>
                    <div className="space-y-2">
                      <CustomerCombobox
                        value={field.value}
                        onChange={field.onChange}
                        customers={customers}
                        searchQuery={searchCust}
                        onSearchQueryChange={setSearchCust}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Type your message here..." 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Send Message</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    <Card className="border-none shadow-sm shadow-black/5">
        <CardHeader className="bg-muted/30 border-b border-dashed py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" /> Your Notification Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-dashed">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={cn(
                    "p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center group",
                    !notif.is_read ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-10 w-10 mt-1">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        S
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">System Notification</span>
                        {!notif.is_read ? (
                          <Badge 
                            className="text-[10px] font-extrabold uppercase bg-primary text-primary-foreground border-none px-1 h-5 cursor-pointer"
                            onClick={() => markAsRead(notif.id)}
                          >
                            New
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-muted text-muted-foreground border-none px-1 h-5">
                            Read
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">
                        {notif.sent_at ? format(new Date(notif.sent_at), 'MMM d, yyyy h:mm a') : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.is_read && (
                       <Button 
                         size="sm" 
                         variant="ghost" 
                         className="text-[10px] font-bold uppercase h-8"
                         onClick={() => markAsRead(notif.id)}
                       >
                         Mark Read
                       </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-10 mx-auto" />
                <p className="font-bold">No history available</p>
                <p className="text-sm">Broadcasted messages will appear here.</p>
              </div>
            )}
          </div>
        </CardContent>
        <div className="p-4 border-t border-dashed flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="font-bold">Page {page} of {totalPages || 1}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

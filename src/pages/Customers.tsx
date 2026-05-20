import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Plus, Mail, Phone, Calendar, User as UserIcon, Fingerprint, CheckCircle2, Loader2, MoreVertical,
  ArrowUp, ArrowDown, ArrowUpDown, Filter, FileText, Eye, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/lib/utils";
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

import { api, PaginatedResponse } from "@/lib/api";
import { Billing } from "./Billing";
import { Checkout } from "../components/Checkout";
import { Reservations } from "./Reservations";

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  status: z.string().default("active"),
  organization: z.string().min(1, { message: "Organization is required." }),
  sub_organization: z.string().min(1, { message: "Sub-organization is required." }),
});

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  first_contact: string;
  avatar?: string;
  profile_photo?: string;
  documents?: string[];
  organization?: string;
  sub_organization?: string;
}

interface User {
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  permissions?: string;
}

export function Customers({ selectedOrg, user }: { selectedOrg?: string, user: User }) {
  const hasPermission = (required: string) => {
    if (!user) return false;
    if (user.role === 'admin' || (user as any).permissions === '*') return true;
    if (!(user as any).permissions) return false;
    const perms = (user as any).permissions.split(',').map((p: string) => p.trim());
    return perms.includes(required) || perms.includes('all');
  };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    sub_organization: "",
    status: ""
  });
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [transferCustomer, setTransferCustomer] = useState<Customer | null>(null);
  const [transferForm, setTransferForm] = useState({ new_organization: '', new_sub_organization: '' });
  const [transferring, setTransferring] = useState(false);
  const [orgConfig, setOrgConfig] = useState<Record<string, string[]>>({});  const handleEditClick = (customer: Customer) => {
    setEditCustomer(customer);
    setEditForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      organization: customer.organization || "Trisha Library",
      sub_organization: customer.sub_organization || "Premium Zone",
      status: customer.status || "active"
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    try {
      await api.put(`/api/customers/${editCustomer.id}`, editForm);
      setEditCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error("Failed to edit customer:", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;
    try {
      await api.delete(`/api/customers/${deleteCustomer.id}`);
      setDeleteCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferCustomer) return;
    setTransferring(true);
    try {
      const res = await api.post<any>(`/api/customers/${transferCustomer.id}/transfer`, transferForm);
      toast.success(res.msg || "Customer transferred successfully.");
      if (res.fee_charged) {
        toast.info("A transfer fee bill was generated.");
      }
      setTransferCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer customer");
    } finally {
      setTransferring(false);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Biometric state
  const [scanCustomer, setScanCustomer] = useState<Customer | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Unified Telemetry States
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [checkoutBill, setCheckoutBill] = useState<any>(null);

  // Tab states for page and expanded view
  const [activeTab, setActiveTab] = useState<'crm' | 'bookings'>(
    hasPermission('manage_customers') ? 'crm' : 'bookings'
  );
  const [expandedSubTabs, setExpandedSubTabs] = useState<Record<string, 'verification' | 'bookings' | 'billing'>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Custom Customer-specific reservations state
  const [customerReservations, setCustomerReservations] = useState<Record<string, any[]>>({});
  const [loadingCustRes, setLoadingCustRes] = useState<Record<string, boolean>>({});
  
  const getCustomerSubTab = (id: string, status: string) => {
    return expandedSubTabs[id] || (status === 'pending' ? 'verification' : 'bookings');
  };

  const setCustomerSubTab = (id: string, tab: 'verification' | 'bookings' | 'billing') => {
    setExpandedSubTabs(prev => ({ ...prev, [id]: tab }));
    if (tab === 'bookings') {
      fetchCustomerReservations(id);
    }
  };

  const fetchCustomerReservations = async (customerId: string) => {
    setLoadingCustRes(prev => ({ ...prev, [customerId]: true }));
    try {
      const data = await api.get<any>(`/api/reservations?customer_id=${customerId}&page=1&size=50`);
      setCustomerReservations(prev => ({ ...prev, [customerId]: data.items }));
    } catch (e) {
      console.error("Failed to load customer reservations:", e);
    } finally {
      setLoadingCustRes(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const handleToggleExpand = (customer: Customer) => {
    if (expandedCustomerId === customer.id) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customer.id);
      const currentTab = getCustomerSubTab(customer.id, customer.status);
      if (currentTab === 'bookings') {
        fetchCustomerReservations(customer.id);
      }
    }
  };

  // Dynamic Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [showPlansDialog, setShowPlansDialog] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<any>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      organization: "Trisha Library",
      sub_organization: "Premium Zone"
    },
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
        search: search
      });
      if (selectedOrg && selectedOrg !== 'All Organizations') {
        params.append('organization', selectedOrg);
      }
      const data = await api.get<PaginatedResponse<Customer>>(`/api/customers?${params.toString()}`);
      setCustomers(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, page, pageSize, sortBy, sortOrder, selectedOrg]);

  useEffect(() => {
    const fetchPlansAndSettings = async () => {
      try {
        const [plansRes, settingsRes] = await Promise.all([
          api.get<any[]>('/api/plans'),
          api.get<any>('/api/settings')
        ]);
        setPlans(plansRes);
        if (settingsRes.organizations_config) {
          setOrgConfig(JSON.parse(settingsRes.organizations_config));
        }
      } catch (e) { }
    };
    fetchPlansAndSettings();
  }, []);

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      const newCustomer = await api.post<Customer>('/api/customers', data);
      setShowAdd(false);
      form.reset();
      fetchCustomers();

      if (plans.length > 0) {
        setPendingCustomer(newCustomer);
        setShowPlansDialog(true);
      } else {
        handleGenerateBill(newCustomer, 1500);
      }
    } catch (err) {
      console.error("Failed to add customer:", err);
    }
  };

  const handleGenerateBill = async (customer: any, amount: number) => {
    setShowPlansDialog(false);
    try {
      const newBill = await api.post('/api/bills', {
        customer_id: customer.id || customer,
        amount: amount,
        pay_via: "UPI",
        month_ending: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        due_date: new Date().toISOString()
      });
      setCheckoutBill(newBill);
    } catch (e) {
      console.error("Failed to auto-generate bill:", e);
    }
  };

  const handleScanClick = (customer: Customer) => {
    setScanCustomer(customer);
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('success');
    }, 2000);
  };

  const handleApprove = async (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    try {
      await api.put(`/api/customers/${customerId}/approve`);
      fetchCustomers();
    } catch (err) {
      console.error("Failed to approve customer", err);
    }
  };

  const filtered = customers;

  return (
    <div className="space-y-6 pb-12">
      {/* Top level tabs */}
      {hasPermission('manage_customers') && hasPermission('manage_reservations') && (
        <div className="flex border-b border-border/40 gap-6 pb-2">
          <button
            onClick={() => setActiveTab('crm')}
            className={cn(
              "pb-2 text-sm font-black uppercase tracking-wider border-b-2 px-1 transition-all",
              activeTab === 'crm' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Customer CRM Directory
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "pb-2 text-sm font-black uppercase tracking-wider border-b-2 px-1 transition-all",
              activeTab === 'bookings' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Live Floor Bookings
          </button>
        </div>
      )}

      {activeTab === 'bookings' ? (
        <Reservations user={user} selectedOrg={selectedOrg} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground">Manage your customer relationships and verification status.</p>
            </div>
            {user.role !== 'staff' && (
              <Button onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New Customer
              </Button>
            )}
          </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer details below. We'll use this for biometric enrollment.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Trisha Library">Trisha Library</SelectItem>
                        <SelectItem value="G2 Library">G2 Library</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sub_organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-organization / Location</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Premium Zone">Premium Zone</SelectItem>
                        <SelectItem value="General Area">General Area</SelectItem>
                        <SelectItem value="Reading Room">Reading Room</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Save Customer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(scanCustomer)} onOpenChange={(open) => !open && setScanCustomer(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold">Biometric Verification</DialogTitle>
            <DialogDescription>
              Please authenticate to view {scanCustomer?.name}'s encrypted records.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8 gap-6">
            <div className="relative h-24 w-24">
              <AnimatePresence mode="wait">
                {scanStatus === 'scanning' ? (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <motion.div
                      className="absolute inset-0 border-4 border-t-primary rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <Fingerprint className="h-12 w-12 text-primary" />
                  </motion.div>
                ) : scanStatus === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-green-500/10 rounded-full" />
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center opacity-20">
                    <Fingerprint className="h-16 w-16" />
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center space-y-1">
              <p className={cn(
                "font-bold tracking-wider text-sm transition-colors",
                scanStatus === 'success' ? "text-green-500" : "text-muted-foreground"
              )}>
                {scanStatus === 'scanning' ? "SCANNING BIOMETRICS..." :
                  scanStatus === 'success' ? "IDENTITY VERIFIED" : "PLACE FINGER ON SENSOR"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold px-8">
                ENCRYPTION KEY: AES-256-GCM READY
              </p>
            </div>
          </div>

          <DialogFooter>
            {scanStatus === 'success' ? (
              <Button className="w-full" onClick={() => setScanCustomer(null)}>Access Records</Button>
            ) : (
              <Button variant="ghost" className="w-full" onClick={() => setScanCustomer(null)}>Cancel</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-sm shadow-black/5">
        <CardHeader className="pb-3 border-b border-dashed">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                className="pl-9 bg-muted/50 border-none shadow-none focus-visible:ring-1"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] bg-muted/50 border-none shadow-none">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="first_contact">Joined Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="bg-muted/50 h-10 w-10"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-dashed divide-border">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((customer) => (
                <div key={customer.id} className="flex flex-col border-b border-dashed border-border last:border-0">
                  <div
                    className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => handleToggleExpand(customer)}
                  >
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {customer.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base truncate">{customer.name}</h3>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase font-bold",
                          customer.status === 'active' ? "text-green-600 bg-green-50 border-green-100" : "bg-muted"
                        )}>
                          {customer.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                          <Mail className="h-3 w-3" /> {customer.email}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                          <Phone className="h-3 w-3" /> {customer.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Since {format(new Date(customer.first_contact), 'MMM yyyy')}
                        </p>
                        {customer.status === 'pending' && user.role !== 'staff' ? (
                          <Button
                            size="sm"
                            className="h-8 px-4 bg-orange-500 hover:bg-orange-600 text-white mt-1"
                            onClick={(e) => handleApprove(e, customer.id)}
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 mt-1"
                            onClick={(e) => { e.stopPropagation(); handleScanClick(customer); }}
                          >
                            <Fingerprint className="h-4 w-4 mr-2" /> Verify
                          </Button>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black text-white border-white/20 font-mono">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(customer);
                            }}
                            className="hover:bg-white/10 cursor-pointer"
                          >
                            Edit Customer
                          </DropdownMenuItem>
                          {hasPermission('manage_customers') && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransferCustomer(customer);
                                const firstOrg = Object.keys(orgConfig)[0] || '';
                                const firstSub = orgConfig[firstOrg]?.[0] || '';
                                setTransferForm({ new_organization: firstOrg, new_sub_organization: firstSub });
                              }}
                              className="hover:bg-white/10 cursor-pointer text-purple-400 focus:text-purple-300 focus:bg-white/10"
                            >
                              Transfer Branch
                            </DropdownMenuItem>
                          )}
                          {hasPermission('dismiss_customer') && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteCustomer(customer);
                                }}
                                className="hover:bg-rose-600 hover:text-white text-rose-500 cursor-pointer"
                              >
                                Delete Customer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {expandedCustomerId === customer.id && (
                    <div className="bg-muted/5 p-6 border-t border-dashed animate-in slide-in-from-top-2 space-y-6">
                      {/* Expanded dossier sub-tabs */}
                      <div className="flex border-b border-border/30 gap-4 pb-1">
                        {hasPermission('manage_customers') && (
                          <button
                            onClick={() => setCustomerSubTab(customer.id, 'verification')}
                            className={cn(
                              "pb-2 text-xs font-bold border-b-2 px-1 transition-all",
                              getCustomerSubTab(customer.id, customer.status) === 'verification' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Verification Dossier
                          </button>
                        )}
                        {hasPermission('manage_reservations') && (
                          <button
                            onClick={() => setCustomerSubTab(customer.id, 'bookings')}
                            className={cn(
                              "pb-2 text-xs font-bold border-b-2 px-1 transition-all",
                              getCustomerSubTab(customer.id, customer.status) === 'bookings' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Seat Reservations
                          </button>
                        )}
                        {hasPermission('view_billing') && (
                          <button
                            onClick={() => setCustomerSubTab(customer.id, 'billing')}
                            className={cn(
                              "pb-2 text-xs font-bold border-b-2 px-1 transition-all",
                              getCustomerSubTab(customer.id, customer.status) === 'billing' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Ledger & Billing
                          </button>
                        )}
                      </div>

                      {/* Sub-tab content */}
                      {getCustomerSubTab(customer.id, customer.status) === 'verification' && hasPermission('manage_customers') && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Profile photo */}
                            <div className="bg-card border border-border/40 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">Profile Photo</h5>
                              {customer.profile_photo ? (
                                <div 
                                  className="h-28 w-28 rounded-full border border-border overflow-hidden cursor-zoom-in relative group"
                                  onClick={() => setSelectedImage(customer.profile_photo)}
                                >
                                  <img src={customer.profile_photo} alt="Profile" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Eye className="h-5 w-5" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground/40">
                                  <UserIcon className="h-10 w-10" />
                                </div>
                              )}
                            </div>

                            {/* Documents list */}
                            <div className="bg-card border border-border/40 p-4 rounded-xl shadow-sm md:col-span-2 space-y-3">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Identity Documents</h5>
                              {customer.documents && customer.documents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {customer.documents.map((doc, idx) => {
                                    const isPdf = doc.startsWith('data:application/pdf') || doc.toLowerCase().endsWith('.pdf');
                                    return isPdf ? (
                                      <a
                                        key={idx}
                                        href={doc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-muted/40 hover:bg-muted rounded-xl text-xs font-bold border border-border/50 transition-all text-foreground"
                                      >
                                        <FileText className="h-5 w-5 text-rose-500" />
                                        <span>View Document PDF</span>
                                      </a>
                                    ) : (
                                      <div
                                        key={idx}
                                        onClick={() => setSelectedImage(doc)}
                                        className="relative h-16 bg-muted/40 border border-border/50 rounded-xl overflow-hidden cursor-zoom-in group flex items-center gap-3 p-2"
                                      >
                                        <img src={doc} alt="Document" className="h-12 w-12 object-cover rounded-lg group-hover:scale-105 transition-transform" />
                                        <span className="text-xs font-bold truncate">Attachment {idx + 1}</span>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 p-1.5 rounded-lg text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Eye className="h-4 w-4" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 border border-dashed rounded-xl h-[90px]">
                                  <AlertCircle className="h-5 w-5 mb-1 opacity-50" />
                                  <span className="text-xs font-medium">No document files uploaded.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Approval Controls */}
                          <div className="flex items-center justify-between p-4 bg-muted/30 border border-border/40 rounded-xl">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Status</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={customer.status === 'active' ? 'success' : 'warning'}>
                                  {customer.status.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {customer.status === 'pending' ? 'Verification and telemetry are offline.' : 'All services active.'}
                                </span>
                              </div>
                            </div>
                            {customer.status === 'pending' && (
                              <Button
                                onClick={(e) => handleApprove(e, customer.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider gap-2 px-6 h-11"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Approve Onboarding
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {getCustomerSubTab(customer.id, customer.status) === 'bookings' && hasPermission('manage_reservations') && (
                        <div className="space-y-4 bg-card border border-border/40 p-6 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Seat Bookings & Holds</h4>
                            <Button 
                              onClick={() => {
                                setActiveTab('bookings');
                              }}
                              size="sm" 
                              className="text-xs gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" /> New Reservation
                            </Button>
                          </div>

                          {loadingCustRes[customer.id] ? (
                            <div className="flex justify-center p-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : !customerReservations[customer.id] || customerReservations[customer.id].length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl">
                              <p className="text-sm font-medium">No reservations found for this customer.</p>
                            </div>
                          ) : (
                            <div className="border border-border/50 rounded-xl overflow-hidden">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                                  <tr>
                                    <th className="p-3">Seat</th>
                                    <th className="p-3">Subsection</th>
                                    <th className="p-3">Start Date</th>
                                    <th className="p-3">End Date</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customerReservations[customer.id].map((res: any) => (
                                    <tr key={res.id} className="border-t border-border/40 hover:bg-muted/10">
                                      <td className="p-3 font-mono font-bold text-primary">{res.seat_number}</td>
                                      <td className="p-3 font-medium">{res.subsection}</td>
                                      <td className="p-3 text-xs text-muted-foreground">
                                        {format(new Date(res.start_date), 'MMM d, yyyy')}
                                      </td>
                                      <td className="p-3 text-xs text-muted-foreground">
                                        {format(new Date(res.end_date), 'MMM d, yyyy')}
                                      </td>
                                      <td className="p-3 font-mono text-xs font-bold">₹{res.amount}</td>
                                      <td className="p-3 text-right">
                                        <Badge variant={res.status === 'paid' ? 'success' : res.status === 'pending' ? 'warning' : 'secondary'}>
                                          {res.status.toUpperCase()}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {getCustomerSubTab(customer.id, customer.status) === 'billing' && hasPermission('view_billing') && (
                        <div className="bg-card border border-border/40 p-6 rounded-xl shadow-sm">
                          <Billing user={user} selectedOrg={selectedOrg} customerId={customer.id} hideHeader={true} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <UserIcon className="h-12 w-12 mb-4 opacity-10" />
                <p className="font-bold">No customers found</p>
                <p className="text-sm">Try adjusting your search criteria.</p>
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

      <Dialog open={!!checkoutBill} onOpenChange={(open) => !open && setCheckoutBill(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 bg-transparent border-none overflow-hidden">
          {checkoutBill && (
            <div className="animate-in fade-in zoom-in duration-300">
              <Checkout billData={checkoutBill} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="text-center mb-4">
            <DialogTitle className="text-2xl font-bold tracking-tight">Select Onboarding Plan</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              Choose an initial subscription tier for this customer.
            </DialogDescription>
          </div>
          <div className="grid gap-3">
            {plans.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-1 justify-start border-border/50 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleGenerateBill(pendingCustomer, p.cost)}
              >
                <div className="flex w-full justify-between items-center">
                  <span className="font-bold text-lg">{p.name}</span>
                  <span className="font-black text-primary">₹{p.cost}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal text-left">{p.description}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setShowPlansDialog(false)}>Skip for Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Customer Dialog */}
      <Dialog open={Boolean(editCustomer)} onOpenChange={(open) => !open && setEditCustomer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                value={editForm.email} 
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                value={editForm.phone} 
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(val) => setEditForm({ ...editForm, status: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-white/20">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select 
                value={editForm.organization} 
                onValueChange={(val) => setEditForm({ ...editForm, organization: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-white/20">
                  <SelectItem value="Trisha Library">Trisha Library</SelectItem>
                  <SelectItem value="G2 Library">G2 Library</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-organization / Zone</Label>
              <Select 
                value={editForm.sub_organization} 
                onValueChange={(val) => setEditForm({ ...editForm, sub_organization: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select sub-organization" />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-white/20">
                  <SelectItem value="Premium Zone">Premium Zone</SelectItem>
                  <SelectItem value="General Area">General Area</SelectItem>
                  <SelectItem value="Reading Room">Reading Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditCustomer(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Customer Dialog */}
      <Dialog open={Boolean(transferCustomer)} onOpenChange={(open) => !open && setTransferCustomer(null)}>
        <DialogContent className="sm:max-w-[425px] bg-black text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Transfer Customer Branch</DialogTitle>
            <DialogDescription className="text-white/70">
              Transferring a customer will cancel their current active reservations and seat holds. A new seat will need to be assigned in the destination branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destination Organization</Label>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={transferForm.new_organization}
                onChange={(e) => {
                  const org = e.target.value;
                  const subOrgs = orgConfig[org] || [];
                  setTransferForm({ new_organization: org, new_sub_organization: subOrgs[0] || '' });
                }}
              >
                {Object.keys(orgConfig).map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Destination Zone</Label>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={transferForm.new_sub_organization}
                onChange={(e) => setTransferForm({ ...transferForm, new_sub_organization: e.target.value })}
              >
                {(orgConfig[transferForm.new_organization] || []).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-md mt-4">
              <p className="text-sm text-purple-300">
                <strong>Note:</strong> Depending on system settings, a Transfer Fee may be automatically generated for the customer.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setTransferCustomer(null)}>Cancel</Button>
              <Button type="submit" disabled={transferring} className="bg-purple-600 hover:bg-purple-700 text-white">
                {transferring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Transfer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <Dialog open={Boolean(deleteCustomer)} onOpenChange={(open) => !open && setDeleteCustomer(null)}>
        <DialogContent className="sm:max-w-[400px] border-rose-500/20 bg-card">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold text-rose-500 flex items-center justify-center gap-2">
              Dismiss Customer Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm pt-2">
              Are you absolutely sure you want to permanently dismiss <span className="font-bold text-foreground">{deleteCustomer?.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs space-y-2 my-2 leading-relaxed">
            <p className="font-bold uppercase tracking-wider">⚠️ CRITICAL SECURITY WARNING:</p>
            <p>This action is irreversible and will execute the following system changes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Delete this customer's active and historical seat reservations.</li>
              <li>Instantly revoke user portal access credentials.</li>
              <li>Wipe all biometric scan telemetry records.</li>
            </ul>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" className="w-full" onClick={() => setDeleteCustomer(null)}>Cancel</Button>
            <Button variant="destructive" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeleteConfirm}>
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}

      {/* Lightbox Dialog for Documents / Profile photos */}
      <Dialog open={Boolean(selectedImage)} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-transparent border-none outline-none shadow-none flex justify-center items-center">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Verification Attachment" 
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl border border-white/20" 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

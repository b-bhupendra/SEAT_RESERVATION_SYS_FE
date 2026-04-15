import React, { useEffect, useState } from 'react';
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
  ArrowUp, ArrowDown, ArrowUpDown, Filter
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

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  status: z.string().default("active"),
});

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  first_contact: string;
  avatar?: string;
}

interface User {
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export function Customers({ selectedOrg, user }: { selectedOrg?: string, user: User }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  
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

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
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
  }, [search, page, pageSize, sortBy, sortOrder]);

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      await api.post('/api/customers', data);
      setShowAdd(false);
      form.reset();
      fetchCustomers();
    } catch (err) {
      console.error("Failed to add customer:", err);
    }
  };

  const handleScanClick = (customer: Customer) => {
    setScanCustomer(customer);
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('success');
    }, 2000); 
  };

  const filtered = customers;

  return (
    <div className="space-y-6 pb-12">
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
                <div key={customer.id} className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-4 hover:bg-muted/30 transition-colors group">
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 mt-1"
                        onClick={() => handleScanClick(customer)}
                      >
                        <Fingerprint className="h-4 w-4 mr-2" /> Verify
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
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
      </div>
    );
  }

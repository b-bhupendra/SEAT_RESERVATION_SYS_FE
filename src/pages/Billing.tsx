import React, { useEffect, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, Bell, QrCode, Calendar as CalendarIcon, CheckCircle2, MoreVertical, Loader2, Receipt,
  Search, ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { api, PaginatedResponse } from "@/lib/api";
import { Checkout } from "@/components/Checkout";
import { CustomerCombobox } from "@/components/CustomerCombobox";

const billSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer."),
  amount: z.coerce.number().min(0, "Amount must be positive."),
  pay_via: z.string().min(1, "Please select payment method."),
  month_ending: z.date({ 
    required_error: "Month ending date is required.",
    invalid_type_error: "Month ending date is required."
  }),
  due_date: z.date({ 
    required_error: "Due date is required.",
    invalid_type_error: "Due date is required."
  }),
});

type BillFormValues = z.infer<typeof billSchema>;

interface Bill {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  due_date: string;
  month_ending: string;
  pay_date: string | null;
  pay_via: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
}

interface User {
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export function Billing({ selectedOrg, user }: { selectedOrg?: string, user: User }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState<Bill | null>(null);
  const [showCheckout, setShowCheckout] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting and Filtering
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // We maintain a searchable state for dropdown
  const [searchCust, setSearchCust] = useState('');
  
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      customer_id: "",
      amount: 0,
      pay_via: "UPI",
      month_ending: new Date(),
      due_date: new Date(),
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const billData = await api.get<PaginatedResponse<Bill>>(`/api/bills?${params.toString()}`);
      setBills(billData.items);
      setTotal(billData.total);
      setTotalPages(billData.pages);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownCustomers = async () => {
    if (!searchCust) return; // avoid fetching if no search
    try {
      // Limit 500 and use search term
      const custData = await api.get<PaginatedResponse<Customer>>(`/api/customers?page=1&size=500&search=${encodeURIComponent(searchCust)}`);
      setCustomers(custData.items);
    } catch (e) {}
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1); // reset to page 1 on filter
      fetchData();
    }, 300);
    return () => clearTimeout(t);
  }, [page, pageSize, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(fetchDropdownCustomers, 300);
    return () => clearTimeout(t);
  }, [searchCust]);

  const onSubmit = async (data: BillFormValues) => {
    try {
      await api.post('/api/bills', {
        ...data,
        customer_id: data.customer_id,
        month_ending: format(data.month_ending, "yyyy-MM-dd'T'HH:mm:ss"), // ISO format for backend
        due_date: format(data.due_date, "yyyy-MM-dd'T'HH:mm:ss"),
      });
      setShowAdd(false);
      form.reset();
      fetchData();
    } catch (err) {
      console.error("Failed to generate bill:", err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/api/bills/${id}/status`, { status });
      fetchData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleSendNotification = async (bill: Bill) => {
    try {
      await api.post('/api/notifications', { 
        customer_id: bill.customer_id, 
        message: `Reminder: Payment of $${bill.amount} for month ending ${bill.month_ending} is due on ${bill.due_date}.` 
      });
      alert('Notification sent!');
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const getDueDays = (dueDate: string, status: string) => {
    if (status === 'paid') return '-';
    try {
      const days = differenceInDays(new Date(dueDate), new Date());
      if (days < 0) return `${Math.abs(days)} days overdue`;
      if (days === 0) return 'Due today';
      return `In ${days} days`;
    } catch {
      return '-';
    }
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Billing & Invoices</h1>
          <p className="text-muted-foreground">Manage payments, invoices, and collection status.</p>
        </div>
        {user.role !== 'staff' && (
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Generate Bill
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card border border-border/40 p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by customer name..." 
            className="pl-9 bg-background/50 border-none shadow-none focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-none shadow-none focus-visible:ring-1">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Invoice</DialogTitle>
            <DialogDescription>
              Complete the details below to generate a new customer invoice.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Search</FormLabel>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pay_via"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Via</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month_ending"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Month Ending</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Generate Bill</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showQR} onOpenChange={(open) => !open && setShowQR(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold">Scan to Pay</DialogTitle>
            <DialogDescription>
              Scan the QR code below to complete the invoice payment.
            </DialogDescription>
          </DialogHeader>
          {showQR && (
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="p-4 bg-white rounded-xl shadow-md border border-border">
                <QRCodeSVG 
                  value={`upi://pay?pa=merchant@upi&pn=${encodeURIComponent(showQR.customer_name)}&am=${showQR.amount}&cu=USD`} 
                  size={200} 
                />
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold">${showQR.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-muted-foreground mt-1 text-center">Invoice: INV-{showQR.id.toString().substring(0, 8)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" onClick={() => setShowQR(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showCheckout} onOpenChange={(open) => !open && setShowCheckout(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 bg-transparent border-none overflow-hidden">
          {showCheckout && (
            <div className="animate-in fade-in zoom-in duration-300">
              <Checkout billData={showCheckout} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-sm shadow-black/5">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('customer_id')}>
                  <div className="flex items-center">Customer {getSortIcon('customer_id')}</div>
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('month_ending')}>
                  <div className="flex items-center">Month Ending {getSortIcon('month_ending')}</div>
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('pay_date')}>
                  <div className="flex items-center">Pay Date {getSortIcon('pay_date')}</div>
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Aging</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center">Amount {getSortIcon('amount')}</div>
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('status')}>
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : bills.length > 0 ? (
                bills.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/30 transition-colors group border-b border-dashed">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{bill.customer_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{bill.customer_phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {bill.month_ending ? format(new Date(bill.month_ending), 'MMM yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {bill.pay_date ? format(new Date(bill.pay_date), 'MMM d, yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold uppercase p-0 h-auto border-none",
                        bill.status === 'overdue' ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {getDueDays(bill.due_date, bill.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">${bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold italic">via {bill.pay_via}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] uppercase font-extrabold px-2 py-0.5",
                        bill.status === 'paid' ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-none" : 
                        bill.status === 'overdue' ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 shadow-none border-none" :
                        "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 shadow-none border-none"
                      )}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bill.status !== 'paid' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => handleSendNotification(bill)} className="h-8 w-8 text-blue-500">
                              <Bell className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setShowQR(bill)} className="h-8 w-8 text-orange-500">
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setShowCheckout(bill)} className="h-8 w-8 text-primary">
                              <Receipt className="h-4 w-4" />
                            </Button>
                            {user.role !== 'staff' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(bill.id, 'paid')}
                                className="bg-green-500/10 text-green-600 hover:bg-green-500 text-[10px] font-bold h-7 px-3 uppercase transition-all"
                              >
                                Paid
                              </Button>
                            )}
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-4 opacity-10 mx-auto" />
                    <p className="font-bold">No bills found</p>
                    <p className="text-sm">Start by generating a new bill for a customer.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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

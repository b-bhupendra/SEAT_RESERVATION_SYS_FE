import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Armchair, Calendar, Clock, MapPin, 
  AlertCircle, CheckCircle2, Loader2, Bell, Sparkles, ShieldCheck,
  Receipt, CreditCard, ArrowUpRight, Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { format, differenceInSeconds, isPast } from 'date-fns';
import { useNotifications } from '@/lib/NotificationContext';
import { Checkout } from '../components/Checkout';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';


interface ReservationData {
  customer_name: string;
  customer_id?: string;
  seat_number: string;
  subsection: string;
  start_date: string;
  end_date: string;
  status: string;
  amount?: number;
  customer_status?: string;
  expires_at?: string;
  msg?: string;
}

interface Seat {
  id: string;
  seat_number: string;
  organization: string;
  sub_organization: string;
  status: string; // available, held, paid
  held_by_customer_id?: string;
  held_by_customer_name?: string;
  expires_at?: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  cost: number;
}

const STUDY_QUOTES = [
  { text: "Deep work is the superpower of the 21st century. Keep pushing, you are building your future right now.", author: "Focus Engine" },
  { text: "Your future self will thank you for the absolute focus and effort you are dedicating today.", author: "Success Core" },
  { text: "Excellence is not a singular act, but a habit of focus, silence, and persistent reading.", author: "Aristotle" },
  { text: "Silence is the noise of a brilliant mind solving the mysteries of the universe.", author: "Intellect Catalyst" },
  { text: "Every single page turned, every topic mastered, is a step closer to your greatest dreams.", author: "Dream Builder" },
  { text: "The secret of getting ahead in life is simply having the courage and discipline to get started.", author: "Mark Twain" },
  { text: "Focus is the ultimate muscle. Train it in this quiet room, and conquer the world outside.", author: "Focus Catalyst" },
  { text: "Success is the sum of small, silent efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Great things are accomplished by a series of small, focused milestones brought together.", author: "Vincent Van Gogh" },
  { text: "Genius is 1% inspiration and 99% perspiration. Your dedication here is absolute proof.", author: "Thomas Edison" }
];

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
  cash_due_date?: string | null;
  notes?: string | null;
}

export function CustomerPortal() {
  const { user } = useAuth();
  const [data, setData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { notifications, markAsRead } = useNotifications();
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * STUDY_QUOTES.length));

  // Billing History States
  const [myBills, setMyBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'admin' || (user as any).permissions === '*') return true;
    if (!(user as any).permissions) return false;
    const perms = (user as any).permissions.split(',').map((p: string) => p.trim());
    return perms.includes(permission);
  };

  const fetchMyBills = async () => {
    try {
      const res = await api.get<Bill[]>('/api/me/bills');
      setMyBills(res);
    } catch (err) {
      console.error("Failed to fetch my bills:", err);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleNextQuote = () => {
    setQuoteIndex(prev => {
      let next = Math.floor(Math.random() * STUDY_QUOTES.length);
      while (next === prev && STUDY_QUOTES.length > 1) {
        next = Math.floor(Math.random() * STUDY_QUOTES.length);
      }
      return next;
    });
  };
  const [renewalBill, setRenewalBill] = useState<any>(null);
  const [optimisticRenewed, setOptimisticRenewed] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPlansDialog, setShowPlansDialog] = useState(false);

  // Seat selection states
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [organization, setOrganization] = useState<string>('Trisha Library');
  const [subOrganization, setSubOrganization] = useState<string>('Premium Zone');
  const [isHolding, setIsHolding] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);


  const fetchData = async () => {
    try {
      const response = await api.get<ReservationData>('/api/me/reservation');
      setData(response);
      
      // If no reservation exists, fetch available seats and plans
      if (!response || response.msg || response.status === 'cancelled') {
        await fetchSeats(organization, subOrganization);
        await fetchPlans();
      }
    } catch (err) {
      console.error("Failed to fetch reservation:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get<Plan[]>('/api/plans');
      setPlans(res);
      if (res.length > 0 && !selectedPlan) {
        setSelectedPlan(res[0]);
      }
    } catch (e) {
      console.error("Failed to fetch plans", e);
    }
  };

  const fetchSeats = async (org: string, subOrg: string) => {
    setLoadingSeats(true);
    try {
      const res = await api.get<Seat[]>(`/api/seats?organization=${org}&sub_organization=${subOrg}`);
      setSeats(res);
      const available = res.filter(s => s.status === 'available');
      if (available.length > 0) {
        setSelectedSeat(available[0].seat_number);
      } else {
        setSelectedSeat('');
      }
    } catch (e) {
      console.error("Failed to fetch seats", e);
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMyBills();
  }, []);

  // Silent live polling for pending/processing payment states
  useEffect(() => {
    const hasUnfinalizedBill = myBills.some(b => 
      b.status === 'pending' || b.status === 'cash_pending' || b.status === 'cash_approved'
    );
    const hasPendingReservation = data?.status === 'pending' || data?.status === 'grace';
    
    if (!hasUnfinalizedBill && !hasPendingReservation) return;

    const interval = setInterval(async () => {
      try {
        const [resBills, resReserv] = await Promise.all([
          api.get<Bill[]>('/api/me/bills'),
          api.get<ReservationData>('/api/me/reservation')
        ]);
        setMyBills(resBills);
        setData(resReserv);
      } catch (e) {
        console.error("Polling fetch failed silently:", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [myBills, data]);


  useEffect(() => {
    // If user has no reservation, refresh seats when org/subOrg changes
    if (!data || data.msg || data.status === 'cancelled') {
      fetchSeats(organization, subOrganization);
    }
  }, [organization, subOrganization, data]);

  // Hold Countdown timer
  useEffect(() => {
    if (data?.status !== 'pending' || !data.expires_at) return;

    const interval = setInterval(() => {
      const expires = new Date(data.expires_at!);
      if (isPast(expires)) {
        setTimeLeft("Hold Expired");
        clearInterval(interval);
        toast.warning("Your seat hold has expired. The seat is released back to booking.");
        fetchData();
        return;
      }

      const totalSeconds = differenceInSeconds(expires, new Date());
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(`${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  // Active membership expiration timer
  useEffect(() => {
    if (data?.status !== 'paid' || !data.end_date) return;

    const interval = setInterval(() => {
      const end = new Date(data.end_date);
      if (isPast(end)) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }

      const totalSeconds = differenceInSeconds(end, new Date());
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const handleOccupySeat = async () => {
    if (!selectedSeat || !selectedPlan) {
      toast.error("Please select a seat and a membership plan.");
      return;
    }
    setIsHolding(true);
    try {
      await api.post('/api/reservations/occupy', {
        seat_number: selectedSeat,
        organization: organization,
        sub_organization: subOrganization,
        plan_cost: selectedPlan.cost
      });
      toast.success("Seat held successfully! Complete your payment within hold duration.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to occupy seat.");
    } finally {
      setIsHolding(false);
    }
  };

  const handleExtendClick = () => {
    if (plans.length > 0) {
      setShowPlansDialog(true);
    } else {
      handleGenerateBill(1500);
    }
  };

  const handleGenerateBill = async (amount: number) => {
    setShowPlansDialog(false);
    try {
      const newBill = await api.post('/api/bills', {
        customer_id: data?.customer_id || "demo", 
        amount: amount,
        pay_via: "UPI",
        month_ending: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        due_date: new Date().toISOString()
      });
      setRenewalBill(newBill);
    } catch (err) {
      console.error("Failed to generate renewal bill", err);
      setRenewalBill({ amount, customer_name: data?.customer_name, customer_id: data?.customer_id || "demo" });
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verification in Progress
  if (data?.customer_status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 px-6 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative p-8 rounded-3xl bg-card border border-orange-500/20 shadow-2xl">
            <Clock className="h-16 w-16 text-orange-500 animate-spin-slow" />
          </div>
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            Verification in Progress
          </h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Your identity is currently being verified by our security team. Access to the matrix workspace will be granted upon successful authorization.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Badge variant="outline" className="px-4 py-1.5 border-orange-500/30 text-orange-500 font-black uppercase tracking-widest bg-orange-500/5">
            Current Status: Pending Approval
          </Badge>
          <Button 
            variant="ghost" 
            onClick={() => window.location.reload()}
            className="text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
          >
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  // State: Late renewal grace period state (GRACE)
  if (data && data.status === 'grace') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12 relative animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tighter flex items-center gap-3">
            Late Renewal Grace Period Active
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
          </h1>
          <p className="text-muted-foreground">Your loyal member seat protection is currently active. Pay before the grace period deadline to keep your seat.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Seat details & Grace warning */}
          <Card className="border border-rose-500/20 relative overflow-hidden bg-gradient-to-br from-rose-500/5 to-background">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Armchair className="h-32 w-32 rotate-12" />
            </div>
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="outline" className={cn(
                  "font-bold px-3 py-1 uppercase tracking-wider text-xs border-border/50",
                  data.loyalty_tier === 'Gold' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  data.loyalty_tier === 'Silver' ? "bg-slate-400/10 text-slate-400 border-slate-400/20" :
                  "bg-orange-500/10 text-orange-500 border-orange-500/20"
                )}>
                  {data.loyalty_tier} Tier Member
                </Badge>
                <div className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">[ Grace Period: {data.grace_days} Days ]</div>
              </div>
              <CardTitle className="text-6xl font-black mt-4 flex items-baseline gap-2 text-rose-500">
                {data.seat_number}
                <span className="text-sm font-medium text-muted-foreground tracking-normal opacity-60">Seat Number</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Section</p>
                  <p className="font-bold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {data.subsection}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Membership Expiry</p>
                  <p className="font-bold text-foreground">{data.end_date ? format(new Date(data.end_date), 'MMM d, yyyy') : "Expired"}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Grace Expiry Date</p>
                    <p className="text-sm font-bold">{data.grace_expiry ? format(new Date(data.grace_expiry), 'MMM d, yyyy h:mm a') : "Expired"}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-rose-500/30 text-rose-500 bg-rose-500/5">
                  Grace Locked
                </Badge>
              </div>

              {/* Fee Breakdown including late fine */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Plan Fee:</span>
                  <span className="font-medium">₹{(data.amount || 1500) - (data.late_fine || 0)}</span>
                </div>
                {data.late_fine && data.late_fine > 0 ? (
                  <div className="flex justify-between text-sm text-rose-500">
                    <span>Late Payment Fine:</span>
                    <span className="font-bold">+ ₹{data.late_fine}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-black pt-2 border-t border-dashed">
                  <span>Total Due:</span>
                  <span className="text-primary text-lg">₹{data.amount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secure Checkout */}
          <Card className="border-border/50 bg-card p-6 flex flex-col justify-center">
            <Checkout billData={{ amount: data.amount || 1500, customer_id: data.customer_id }} />
          </Card>
        </div>
      </div>
    );
  }

  // State 1: Payment hold reservation state (PENDING)
  if (data && data.status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12 relative">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tighter flex items-center gap-3">
            Seat Hold Active
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-ping" />
          </h1>
          <p className="text-muted-foreground">Complete payment to finalize your booking before the deadline.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Seat details */}
          <Card className="border border-orange-500/20 relative overflow-hidden bg-gradient-to-br from-orange-500/5 to-background">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Armchair className="h-32 w-32 rotate-12" />
            </div>
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-bold px-3 py-1 uppercase tracking-wider text-xs">
                  Pending Payment Hold
                </Badge>
                <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">[ Awaiting Cash/UPI ]</div>
              </div>
              <CardTitle className="text-6xl font-black mt-4 flex items-baseline gap-2 text-orange-500">
                {data.seat_number}
                <span className="text-sm font-medium text-muted-foreground tracking-normal opacity-60">Seat Number</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Section</p>
                  <p className="font-bold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {data.subsection}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Hold Amount</p>
                  <p className="font-bold text-foreground text-lg">₹{data.amount}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-between text-orange-600 dark:text-orange-400">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Expires In</p>
                    <p className="text-lg font-black tracking-tight">{timeLeft}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-orange-500/30 text-orange-500 animate-pulse bg-orange-500/5">
                  Held
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Secure Checkout */}
          <Card className="border-border/50 bg-card p-6 flex flex-col justify-center">
            <Checkout billData={{ amount: data.amount || 1500, customer_id: data.customer_id }} />
          </Card>
        </div>
      </div>
    );
  }

  // State 2: No active reservation -> Seat Selection Matrix
  if (!data || data.msg || data.status === 'cancelled') {
    // Hide paid seats and display others
    const visibleSeats = seats.filter(s => s.status !== 'paid');

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12 relative animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tighter flex items-center gap-2">
            Secure Your Seat
            <Sparkles className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground">Select an available library seat and a membership plan to occupy it.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Seat grid & Subsection selection */}
          <Card className="md:col-span-2 shadow-sm border-border/50 bg-card/40 backdrop-blur-xl">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Seat Layout Grid</CardTitle>
                  <CardDescription>Click a vacant seat below to occupy it.</CardDescription>
                </div>
                {/* Organization and SubOrg selectors */}
                <div className="flex items-center gap-2">
                  <select 
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  >
                    <option value="Trisha Library">Trisha Library</option>
                    <option value="G2 Library">G2 Library</option>
                  </select>
                  <select 
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={subOrganization}
                    onChange={(e) => setSubOrganization(e.target.value)}
                  >
                    <option value="Premium Zone">Premium Zone</option>
                    <option value="General Area">General Area</option>
                    <option value="Reading Room">Reading Room</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingSeats ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : visibleSeats.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed rounded-xl border-border/50">
                  <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground font-medium">No vacant seats in this section.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {visibleSeats.map(seat => {
                    const isSelected = selectedSeat === seat.seat_number;
                    const isHeld = seat.status === 'held';
                    
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isHeld}
                        onClick={() => setSelectedSeat(seat.seat_number)}
                        className={cn(
                          "relative p-3 flex flex-col items-center justify-center border rounded-xl font-bold transition-all select-none min-h-[64px]",
                          isSelected 
                            ? "border-primary bg-primary/10 text-primary scale-105 shadow-md shadow-primary/10" 
                            : isHeld
                            ? "border-amber-500/20 bg-amber-500/5 text-amber-500/40 cursor-not-allowed opacity-50"
                            : "border-border/50 hover:border-primary/50 bg-card hover:bg-primary/5 text-foreground"
                        )}
                      >
                        <Armchair className={cn("h-5 w-5 mb-1", isSelected ? "animate-pulse" : "")} />
                        <span className="text-[10px] tracking-tight">{seat.seat_number}</span>
                        {isHeld && (
                          <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase scale-90">
                            Hold
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checkout & Plan Selection Card */}
          <Card className="shadow-sm border-border/50 bg-card h-fit flex flex-col">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Booking Details</CardTitle>
              <CardDescription>Finalize membership options.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label>Selected Seat</Label>
                <div className="p-3 bg-muted/30 border border-border/50 rounded-xl font-black text-primary text-xl flex items-center gap-2">
                  <Armchair className="h-5 w-5" />
                  {selectedSeat || "None Selected"}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Choose Plan</Label>
                {plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans found.</p>
                ) : (
                  <div className="grid gap-2">
                    {plans.map(p => {
                      const isSelected = selectedPlan?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlan(p)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between",
                            isSelected 
                              ? "border-primary bg-primary/10 text-primary shadow-sm" 
                              : "border-border/50 hover:border-primary/30 hover:bg-muted/30 text-foreground bg-card"
                          )}
                        >
                          <div>
                            <p className="font-bold text-sm">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
                          </div>
                          <span className="font-black text-sm text-foreground">₹{p.cost}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleOccupySeat}
                disabled={!selectedSeat || !selectedPlan || isHolding}
                className="w-full h-12 text-sm font-bold uppercase tracking-widest mt-4"
              >
                {isHolding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Occupy Seat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // State 3: Paid active reservation state (PAID)
  const isExpiringSoon = !optimisticRenewed && data.end_date && differenceInSeconds(new Date(data.end_date), new Date()) < 3600 * 24 * 3;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 relative">
      {isExpiringSoon && <div className="aura-siren" />}
      
      <div className="flex flex-col gap-2 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-extrabold tracking-tighter"
        >
          My Workspace
        </motion.h1>
        <p className="text-muted-foreground">Welcome back, {data.customer_name}. Here is your current seat status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seat Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-primary/20 via-background to-background group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Armchair className="h-32 w-32 rotate-12" />
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
                  Active Member
                </Badge>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <CardTitle className="text-6xl font-black mt-4 flex items-baseline gap-2">
                {data.seat_number}
                <span className="text-sm font-medium text-muted-foreground tracking-normal opacity-60">Seat Number</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Section</p>
                  <p className="font-bold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {data.subsection}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</p>
                  <p className="font-bold text-green-500 flex items-center justify-end gap-2 text-sm uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Expires On</p>
                    <p className="text-sm font-bold">{data.end_date ? format(new Date(data.end_date), 'MMM d, yyyy') : "Never"}</p>
                  </div>
                </div>
                {isExpiringSoon && (
                  <Badge variant="destructive" className="animate-bounce">Urgent</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Countdown / Focus quote column */}
        {isExpiringSoon ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            <Card className="flex-1 bg-card/40 backdrop-blur-xl border-border/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className={cn(
                "p-4 rounded-full",
                "bg-rose-500/10 text-rose-500"
              )}>
                <Clock className="h-8 w-8 text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Time Remaining</h3>
                <p className="text-4xl font-black tabular-nums tracking-tighter text-rose-500 animate-pulse">
                  {timeLeft}
                </p>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none p-6 text-white overflow-hidden relative shadow-xl">
               <div className="absolute -bottom-4 -right-4 opacity-20">
                 <Bell className="h-24 w-24 -rotate-12" />
               </div>
               <h4 className="font-bold text-lg mb-1">Need an Extension?</h4>
               <p className="text-white/80 text-xs mb-4 max-w-[200px]">Extend your seat reservation effortlessly before it expires.</p>
               <Button variant="secondary" size="sm" className="font-bold text-xs uppercase tracking-wider" onClick={handleExtendClick}>
                 Extend Now
               </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col h-full animate-in fade-in zoom-in duration-500"
          >
            <Card className="flex-1 border-none shadow-2xl relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-background to-background group p-8 flex flex-col justify-between min-h-[350px]">
              {/* Glowing blur effects */}
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full scale-150 -translate-x-12 -translate-y-12 animate-pulse" />
              <div className="absolute bottom-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="h-32 w-32 text-emerald-500 rotate-12" />
              </div>

              <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 font-extrabold px-3 py-1 text-xs uppercase tracking-wider">
                    Focus Zone Active
                  </Badge>
                </div>
                <Button 
                  aria-label="Refresh study quote"
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextQuote}
                  className="h-8 w-8 hover:bg-emerald-500/10 text-emerald-500 rounded-full transition-transform active:rotate-180 duration-500"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col justify-center">
                <blockquote className="space-y-4">
                  <p className="text-xl md:text-2xl font-medium italic leading-relaxed text-foreground tracking-wide font-sans">
                    “{STUDY_QUOTES[quoteIndex].text}”
                  </p>
                  <footer className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <span className="h-1.5 w-6 bg-emerald-500 rounded-full" />
                    {STUDY_QUOTES[quoteIndex].author}
                  </footer>
                </blockquote>
              </CardContent>

              <div className="pt-6 border-t border-emerald-500/10 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Status: Membership Extended</span>
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  All clear
                </span>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Ability-Based Billing & Notifications Grid */}
      {hasPermission('view_portal') && (
        <div className="grid gap-6 md:grid-cols-3 pt-4 relative z-10">
          
          {/* Left Column: Billing & Subscriptions */}
          <div className="md:col-span-2 space-y-4">
             <h3 className="text-xl font-bold flex items-center gap-2">
               <Receipt className="h-5 w-5 text-primary" /> 
               Billing & Invoices
             </h3>
             <Card className="border-none shadow-sm shadow-black/5 bg-card/50 backdrop-blur-md">
                <div className="divide-y divide-dashed border-t border-border">
                  {loadingBills ? (
                    <div className="p-12 flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : myBills.length > 0 ? (
                    <AnimatePresence>
                      {myBills.map((bill) => {
                        const isUnpaid = bill.status === 'pending' || bill.status === 'overdue';
                        const isCashPending = bill.status === 'cash_pending';
                        const isCashApproved = bill.status === 'cash_approved';
                        
                        return (
                          <motion.div 
                            key={bill.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex gap-3 items-start">
                              <div className={cn(
                                "p-2 rounded-lg mt-0.5",
                                bill.status === 'paid' ? "bg-green-500/10 text-green-500" :
                                bill.status === 'overdue' ? "bg-red-500/10 text-red-500" :
                                "bg-orange-500/10 text-orange-500"
                              )}>
                                {bill.status === 'paid' ? <CheckCircle2 className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">Invoice INV-{bill.id.substring(0, 8).toUpperCase()}</span>
                                  <Badge className={cn(
                                    "text-[9px] uppercase font-extrabold px-2 py-0.5 h-auto border-none",
                                    bill.status === 'paid' ? "bg-green-500/15 text-green-600 hover:bg-green-500/20 shadow-none" : 
                                    bill.status === 'overdue' ? "bg-red-500/15 text-red-600 hover:bg-red-500/20 shadow-none" :
                                    "bg-orange-500/15 text-orange-600 hover:bg-orange-500/20 shadow-none"
                                  )}>
                                    {bill.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium">
                                  Month ending: {format(new Date(bill.month_ending), 'MMMM yyyy')}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                  {bill.pay_via === 'Cash' ? 'Pay via cash' : 'Pay via digital UPI'}
                                </p>
                                
                                {isCashApproved && bill.cash_due_date && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10 text-[10px] text-orange-500 font-bold max-w-sm">
                                    ⚠️ Action Required: Handover ₹{bill.amount} cash to reception by {format(new Date(bill.cash_due_date), 'd MMM yyyy, h:mm a')}
                                  </div>
                                )}
                                {bill.notes && (
                                  <p className="text-[10px] text-muted-foreground italic mt-1 font-medium">Note: "{bill.notes}"</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2">
                              <span className="font-black text-base text-foreground">₹{bill.amount}</span>
                              {isUnpaid && (
                                <Button 
                                  size="sm" 
                                  className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider gap-1"
                                  onClick={() => setRenewalBill(bill)}
                                >
                                  Pay Now <ArrowUpRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {isCashPending && (
                                <span className="text-[9px] font-black uppercase text-orange-500 border border-orange-500/20 bg-orange-500/5 px-2 py-0.5 rounded">
                                  Awaiting Approval
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold">No invoice history</p>
                    </div>
                  )}
                </div>
             </Card>
          </div>

          {/* Right Column: Notifications Inbox */}
          <div className="space-y-4">
             <h3 className="text-xl font-bold flex items-center gap-2">
               <Bell className="h-5 w-5 text-primary" /> 
               Notifications
             </h3>
             <Card className="border-none shadow-sm shadow-black/5 bg-card/50 backdrop-blur-md">
                <div className="divide-y divide-dashed border-t border-border">
                  {notifications.length > 0 ? notifications.map(notif => (
                    <div key={notif.id} className="p-4 flex gap-3 items-start">
                      <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs">System Alert</p>
                          {!notif.is_read && <Badge className="text-[8px] uppercase px-1 h-3.5">New</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground/60 mt-2">{format(new Date(notif.sent_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                      {!notif.is_read && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => markAsRead(notif.id)}>Dismiss</Button>
                      )}
                    </div>
                  )) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold">No new notifications</p>
                    </div>
                  )}
                </div>
             </Card>
          </div>

        </div>
      )}


      <Dialog open={!!renewalBill} onOpenChange={(open) => {
          if (!open) {
             setRenewalBill(null);
             setOptimisticRenewed(true);
          }
      }}>
        <DialogContent className="sm:max-w-[450px] p-0 bg-transparent border-none overflow-hidden relative z-50">
          {renewalBill && (
            <Checkout billData={renewalBill} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Select a Plan</h2>
            <p className="text-muted-foreground text-sm">Choose your extension duration and tier.</p>
          </div>
          <div className="grid gap-3">
            {plans.map((p) => (
              <Button 
                key={p.id} 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start gap-1 justify-start border-border/50 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleGenerateBill(p.cost)}
              >
                <div className="flex w-full justify-between items-center">
                  <span className="font-bold text-lg">{p.name}</span>
                  <span className="font-black text-primary">₹{p.cost}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal text-left">{p.description}</span>
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setShowPlansDialog(false)}>Cancel</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

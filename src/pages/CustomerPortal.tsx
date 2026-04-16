import React, { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { 
  Armchair, Calendar, Clock, MapPin, 
  AlertCircle, CheckCircle2, Loader2, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { format, differenceInSeconds, isPast } from 'date-fns';

interface ReservationData {
  customer_name: string;
  seat_number: string;
  subsection: string;
  start_date: string;
  end_date: string;
  status: string;
  msg?: string;
}

export function CustomerPortal() {
  const [data, setData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<ReservationData>('/api/me/reservation');
        setData(response);
      } catch (err) {
        console.error("Failed to fetch reservation:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!data?.end_date) return;

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

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.msg) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4 px-4">
        <div className="p-6 rounded-full bg-muted/20 border border-border">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">No Active Reservation</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {data?.msg || "We couldn't find an active seat reservation for your account. Please contact the manager."}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    );
  }

  const isExpiringSoon = data.end_date && differenceInSeconds(new Date(data.end_date), new Date()) < 3600 * 24 * 3;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
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
                    <p className="text-sm font-bold">{format(new Date(data.end_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                {isExpiringSoon && (
                  <Badge variant="destructive" className="animate-bounce">Urgent</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Countdown Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col gap-6"
        >
          <Card className="flex-1 bg-card/40 backdrop-blur-xl border-border/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className={cn(
              "p-4 rounded-full",
              isExpiringSoon ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
            )}>
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Time Remaining</h3>
              <p className={cn(
                "text-4xl font-black tabular-nums tracking-tighter",
                isExpiringSoon ? "text-rose-500" : "text-foreground"
              )}>
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
             <Button variant="secondary" size="sm" className="font-bold text-xs uppercase tracking-wider">
               Contact Support
             </Button>
          </Card>
        </motion.div>
      </div>

      <div className="pt-8 flex flex-col items-center gap-4 text-center">
        <p className="text-xs text-muted-foreground font-medium italic">"A quiet workspace is a productive workspace."</p>
        <div className="flex items-center gap-6 opacity-40">
           <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" className="h-4 w-4 grayscale" alt="" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" className="h-4 w-4 grayscale" alt="" />
           <img src="https://upload.wikimedia.org/wikipedia/commons/4/4d/Microsoft_Teams_logo.svg" className="h-4 w-4 grayscale" alt="" />
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

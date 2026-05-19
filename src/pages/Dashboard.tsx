import React, { useEffect, useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { 
  Users, CalendarDays, Wallet, TrendingUp,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { subDays, startOfMonth, format, endOfToday } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Filter } from 'lucide-react';

const COLORS = ['#00AB55', '#3366FF', '#FFC107', '#FF4842', '#1890FF'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
        <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
        <div className="border-t border-dashed border-border pt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Revenue' ? '$' : ''}{entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface User {
  email: string;
  role: string;
}

interface Stats {
  total_customers: number;
  active_reservations: number;
  total_revenue: number;
  usage_rate: number;
  revenue_by_day: { name: string, Revenue: number }[];
  payments_overview: { name: string, value: number }[];
  occupancy_by_zone: { name: string, value: number }[];
  reservation_status: { name: string, value: number }[];
}


export function Dashboard({ selectedOrg, user }: { selectedOrg?: string, user: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('this_month');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let start_date: Date | null = null;
        let end_date: Date = endOfToday();

        if (timeRange === 'last_7_days') {
          start_date = subDays(new Date(), 7);
        } else if (timeRange === 'last_30_days') {
          start_date = subDays(new Date(), 30);
        } else if (timeRange === 'this_month') {
          start_date = startOfMonth(new Date());
        }

        const params = new URLSearchParams();
        if (start_date) params.append('start_date', format(start_date, "yyyy-MM-dd'T'HH:mm:ss"));
        params.append('end_date', format(end_date, "yyyy-MM-dd'T'HH:mm:ss"));

        const dashboardStats = await api.get<Stats>(`/api/dashboard?${params.toString()}`);
        setStats(dashboardStats);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const multiplier = selectedOrg === 'Trisha Library' ? 0.6 : selectedOrg === 'G2 Library' ? 0.4 : 1;

  const cards = [
    { 
      name: 'Total Revenue', 
      value: (stats?.total_revenue || 0) * multiplier, 
      displayValue: `$${((stats?.total_revenue || 0) * multiplier).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
      change: '+20.1%', 
      icon: <Wallet className="h-5 w-5" />, 
      color: 'text-primary', 
      bg: 'bg-primary/10' 
    },
    { 
      name: 'Active Reservations', 
      value: (stats?.active_reservations || 0) * multiplier, 
      displayValue: Math.floor((stats?.active_reservations || 0) * multiplier).toString(),
      change: '+15%', 
      icon: <CalendarDays className="h-5 w-5" />, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      name: 'New Customers', 
      value: (stats?.total_customers || 0) * multiplier, 
      displayValue: Math.floor((stats?.total_customers || 0) * multiplier).toString(),
      change: '-2%', 
      icon: <Users className="h-5 w-5" />, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10' 
    },
    { 
      name: 'Usage Rate', 
      value: stats?.usage_rate || 0, 
      displayValue: `${stats?.usage_rate || 0}%`,
      change: '+8%', 
      icon: <TrendingUp className="h-5 w-5" />, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10' 
    }
  ];

  const revenueData = stats?.revenue_by_day || [];
  const paymentMethodData = stats?.payments_overview || [];
  const occupancyZoneData = stats?.occupancy_by_zone || [];
  const reservationStatusData = stats?.reservation_status || [];


  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi, Welcome back 👋</h1>
          <p className="text-muted-foreground">Overview for {selectedOrg ? selectedOrg.replace(/,/g, ', ') : 'All Organizations'}</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border/40 p-1.5 rounded-xl shadow-sm">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-background/50 border-none shadow-none h-9 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Range" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
            <Filter className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.name} className="border-none shadow-sm shadow-black/5">
            <CardContent className="flex items-center p-6">
              <div className={cn("p-3 rounded-full mr-4 flex items-center justify-center", card.bg, card.color)}>
                {card.icon}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.name}</p>
                <p className="text-2xl font-bold">{card.displayValue}</p>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-xs font-bold",
                    card.change.startsWith('+') ? "text-green-500" : "text-rose-500"
                  )}>
                    {card.change}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Revenue Analytics</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00AB55" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00AB55" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-[10px] font-bold fill-muted-foreground"
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-[10px] font-bold fill-muted-foreground"
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Revenue" 
                    stroke="#00AB55" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Payments Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    className="text-[10px] uppercase font-bold text-muted-foreground"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3 border-none shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Zone Occupancy Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 350, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyZoneData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Occupants" fill="#00AB55" radius={[4, 4, 0, 0]}>
                    {occupancyZoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Reservation Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div style={{ width: '100%', height: 350, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationStatusData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="text-[10px] font-bold fill-muted-foreground uppercase" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Reservations" fill="#3366FF" radius={[0, 4, 4, 0]}>
                    {reservationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

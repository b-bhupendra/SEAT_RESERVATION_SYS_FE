import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ShieldCheck, BarChart3, Bell, QrCode, Lock, Rocket, 
  ChevronRight, Sparkles, Sun, Moon, Mail, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

interface LandingPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function LandingPage({ darkMode, onToggleDarkMode }: LandingPageProps) {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('john@example.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Automatically redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      // Under the hood, use a dummy password as backend expects one for the schema, 
      // but route_users will bypass it for customers
      await login({
        email,
        password: 'passwordless', 
        role: 'customer'
      });
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Access Denied. Please verify your registered email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 20 
      } 
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/30 pb-[env(safe-area-inset-bottom,0px)]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-primary/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-500/10 blur-[150px] rounded-full" 
        />
      </div>
      
      {/* Mesh Gradient Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] dark:opacity-[0.1]" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--primary) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Navigation Bar */}
      <nav className="relative z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 sm:px-6 py-4 sticky top-0 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group cursor-pointer hover:rotate-12 transition-transform">
              <Sparkles className="h-5 sm:h-6 w-5 sm:w-6 text-primary-foreground" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">LUMINA PRO</span>
          </motion.div>
          <div className="flex items-center gap-3 sm:gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleDarkMode}
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 hover:bg-muted active:scale-90 transition-all border border-border/50"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={darkMode ? 'dark' : 'light'}
                  initial={{ y: 20, opacity: 0, rotate: 45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -20, opacity: 0, rotate: -45 }}
                  transition={{ duration: 0.2 }}
                >
                  {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
                </motion.div>
              </AnimatePresence>
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline" className="font-bold rounded-full px-4 sm:px-6 h-9 sm:h-11 text-xs sm:text-sm border-border/60 hover:bg-muted transition-all">
              Employee Portal
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-20 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          
          {/* LEFT: CUSTOMER PORTAL ACCESS FORM */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col text-left"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 p-1.5 pr-5 bg-primary/5 border border-primary/20 rounded-full mb-6 sm:mb-8 backdrop-blur-md shadow-inner">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase">Occupant Portal</span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-primary/80">Secure Telemetry Access</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] sm:leading-[0.85] mb-6 sm:mb-8">
                Access Your<br />
                <span className="text-primary relative inline-block">
                  Workspace.
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.5, duration: 1.2, ease: "circOut" }}
                    className="absolute -bottom-2 sm:-bottom-3 left-0 h-2 sm:h-3 bg-primary/20 rounded-full" 
                  />
                </span>
              </h1>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-lg leading-relaxed font-medium">
                Enter your registered identity to view active seat allocation, real-time resource telemetry, and dynamic billing invoices.
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-border/40 shadow-2xl bg-card/40 backdrop-blur-3xl overflow-hidden ring-1 ring-white/10 max-w-md w-full">
                <CardContent className="p-6 sm:p-8">
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        <p className="text-[11px] font-black text-destructive uppercase tracking-widest leading-normal">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={handleCustomerLogin} className="space-y-4 sm:space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="cust-email" className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/80 ml-1">
                        Registered Email Address
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="cust-email" 
                          type="email" 
                          placeholder="e.g. john@example.com"
                          className="pl-12 h-12 sm:h-14 bg-background/40 border-border/50 focus:border-primary/50 transition-all rounded-xl font-semibold" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full h-12 sm:h-14 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary text-primary-foreground rounded-xl"
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Access"}
                    </Button>
                  </form>

                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* RIGHT: FEATURE GRID */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative mt-12 lg:mt-0"
          >
            {/* Feature Cards with Glassmorphism */}
            <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.01 }} className="col-span-1 sm:col-span-2">
              <Card className="h-44 sm:h-52 bg-card/40 backdrop-blur-3xl border-primary/20 shadow-2xl overflow-hidden group relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/30 transition-all duration-700" />
                <CardContent className="p-6 sm:p-10 h-full flex flex-col justify-between relative z-10">
                  <BarChart3 className="h-10 sm:h-12 w-10 sm:w-12 text-primary group-hover:scale-110 transition-transform duration-500" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Omni-Analytics</h3>
                    <p className="text-sm sm:text-lg text-muted-foreground font-bold">Real-time data synchronization across all organizational layers.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
              <Card className="h-52 sm:h-64 bg-card/30 backdrop-blur-2xl border-border/50 shadow-xl group">
                <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
                    <Lock className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500 group-hover:rotate-12 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">Security</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-bold leading-relaxed">AES-256 encryption and biometric MFA integration.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }}>
              <Card className="h-52 sm:h-64 bg-card/40 backdrop-blur-2xl border-primary/10 shadow-xl group hover:border-primary/30 transition-colors">
                <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 ring-1 ring-amber-500/20">
                    <Bell className="h-6 sm:h-8 w-6 sm:w-8 text-amber-500 group-hover:animate-shake" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">Smart Alerts</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-bold leading-relaxed">Predictive resource tracking and automated constraints.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.01 }} className="col-span-1 sm:col-span-2">
              <Card className="h-36 sm:h-44 bg-primary/10 border-dashed border-primary/40 shadow-none relative overflow-hidden flex items-center group cursor-pointer hover:bg-primary/20 transition-all duration-300">
                <div className="p-6 sm:p-10 z-10">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
                    <QrCode className="h-7 sm:h-8 w-7 sm:w-8 text-primary group-hover:rotate-12 transition-transform" /> Matrix Payments
                  </h3>
                  <p className="text-sm sm:text-lg text-muted-foreground font-bold max-w-sm">Dynamic settlement via next-gen QR protocols.</p>
                </div>
                <QrCode className="absolute -bottom-10 -right-10 h-48 sm:h-64 w-48 sm:w-64 text-primary/10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000" />
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="relative z-10 border-t border-border/40 py-10 sm:py-12 bg-card/20 backdrop-blur-md pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2 opacity-60">
            <Sparkles className="h-5 w-5" />
            <span className="font-black text-sm tracking-tighter">LUMINA PRO ENGINE</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-muted-foreground/60 text-center">
            Built for Global Scale • Trusted by 500+ Enterprises
          </p>
        </div>
      </footer>
    </div>
  );
}

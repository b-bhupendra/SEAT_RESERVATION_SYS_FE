import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Moon, Sun, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/AuthContext";

interface LoginProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Login({ darkMode, onToggleDarkMode }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin');
  const [role, setRole] = useState<'admin' | 'manager' | 'staff' | 'customer'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await login({ 
        email, 
        password, 
        role, 
        full_name: email.split('@')[0] // Fallback full name
      });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20 dark:opacity-40">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 45, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-primary/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -45, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] bg-blue-500/10 blur-[120px] rounded-full" 
        />
      </div>

      <div className="absolute top-6 right-6 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleDarkMode}
          className="rounded-full w-12 h-12 bg-background/40 backdrop-blur-xl border border-border/50 hover:bg-accent transition-all active:scale-90 shadow-lg"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={darkMode ? 'dark' : 'light'}
              initial={{ y: 20, opacity: 0, rotate: 45 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0, rotate: -45 }}
              transition={{ duration: 0.2 }}
            >
              {darkMode ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-slate-700" />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="mb-10 text-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 rotate-12">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl font-black tracking-tighter mb-2 bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent"
          >
            Lumina Pro
          </motion.h1>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] opacity-60">Enterprise Management Suite</p>
        </div>

        <Card className="border-border/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-card/30 backdrop-blur-3xl overflow-hidden ring-1 ring-white/10">
          <CardContent className="pt-10 px-10 pb-10">
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mb-8 overflow-hidden"
              >
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <p className="text-xs font-black text-destructive uppercase tracking-widest">{error}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/80 ml-1">Identity</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    className="pl-12 h-14 bg-background/20 border-border/40 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl placeholder:text-muted-foreground/30 font-semibold" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/80">Secret Key</Label>
                  <button type="button" className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors">
                    Reset
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    className="pl-12 pr-12 h-14 bg-background/20 border-border/40 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl placeholder:text-muted-foreground/30 font-semibold" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all active:scale-90"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all bg-primary text-primary-foreground rounded-2xl ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Authorize"
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="mt-12 pt-10 border-t border-dashed border-border/50 text-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-transparent backdrop-blur-3xl">
                <span className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-[0.5em]">Credentials</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {['admin', 'manager', 'staff', 'customer'].map((r) => (
                  <motion.div 
                    key={r}
                    whileHover={{ x: 5, backgroundColor: 'hsl(var(--muted))' }}
                    className="text-[10px] font-bold py-3 px-4 bg-muted/40 rounded-xl border border-border/30 flex justify-between items-center group cursor-pointer transition-all" 
                    onClick={() => {
                      if (r === 'customer') {
                        setEmail('customer@example.com');
                        setPassword('customer123');
                      } else {
                        setEmail(`${r}@admin.com`);
                        setPassword('admin'); // Assuming 'admin' is the default for others for now
                      }
                      setRole(r as any);
                    }}
                  >
                    <span className="text-muted-foreground/60 uppercase tracking-widest">{r}</span>
                    <span className="text-foreground tracking-tight">{r === 'customer' ? 'customer@example.com' : `${r}@admin.com`}</span>
                  </motion.div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground/30 mt-6 font-black uppercase tracking-[0.3em]">Access code: admin</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

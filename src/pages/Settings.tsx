import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Plus, Trash2, Loader2, IndianRupee,
  Clock, Timer, Award, ShieldCheck, AlertCircle, Info
} from "lucide-react";
import { Textarea } from '@/components/ui/textarea';

interface Plan {
  id: string;
  name: string;
  description: string;
  cost: number;
}

interface Settings {
  seat_hold_duration_minutes?: string;
  loyalty_grace_bronze_days?: string;
  loyalty_grace_silver_days?: string;
  loyalty_grace_gold_days?: string;
  late_payment_fine_amount?: string;
  customer_transfer_fee?: string;
  organizations_config?: string;
}

// Compact info banner
function InfoBanner({ icon: Icon, text, color = "blue" }: { icon: any; text: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-500/10 text-blue-600 border-blue-500/20",
    amber:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
    green:  "bg-green-500/10 text-green-600 border-green-500/20",
  };
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${colors[color]}`}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export function Settings() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '', cost: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checkout hold
  const [holdDuration, setHoldDuration] = useState('15');
  const [isSavingHold, setIsSavingHold] = useState(false);

  // Loyalty grace
  const [graceBronze, setGraceBronze] = useState('2');
  const [graceSilver, setGraceSilver] = useState('4');
  const [graceGold, setGraceGold] = useState('7');
  const [isSavingGrace, setIsSavingGrace] = useState(false);
  const [graceError, setGraceError] = useState('');

  // Fine amount
  const [fineAmount, setFineAmount] = useState('250');
  const [isSavingFine, setIsSavingFine] = useState(false);

  // Transfer Fee
  const [transferFee, setTransferFee] = useState('500');
  const [isSavingTransferFee, setIsSavingTransferFee] = useState(false);

  // Organizations Config
  const [orgConfigRaw, setOrgConfigRaw] = useState('{}');
  const [orgConfig, setOrgConfig] = useState<Record<string, string[]>>({});
  const [isSavingOrgConfig, setIsSavingOrgConfig] = useState(false);

  // Seat generator
  const [generatorData, setGeneratorData] = useState({
    organization: 'Trisha Library',
    sub_organization: 'Premium Zone',
    prefix: 'TL-PM-',
    count: '10'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPlansAndSettings = async () => {
    try {
      const [plansData, settings] = await Promise.all([
        api.get<Plan[]>('/api/plans'),
        api.get<Settings>('/api/settings'),
      ]);
      setPlans(plansData);
      if (settings.seat_hold_duration_minutes) setHoldDuration(settings.seat_hold_duration_minutes);
      if (settings.loyalty_grace_bronze_days)  setGraceBronze(settings.loyalty_grace_bronze_days);
      if (settings.loyalty_grace_silver_days)  setGraceSilver(settings.loyalty_grace_silver_days);
      if (settings.loyalty_grace_gold_days)    setGraceGold(settings.loyalty_grace_gold_days);
      if (settings.late_payment_fine_amount)   setFineAmount(settings.late_payment_fine_amount);
      if (settings.customer_transfer_fee)      setTransferFee(settings.customer_transfer_fee);
      if (settings.organizations_config) {
        setOrgConfigRaw(settings.organizations_config);
        try { setOrgConfig(JSON.parse(settings.organizations_config)); } catch(e) { }
      }
    } catch {
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlansAndSettings(); }, []);

  // ── Plan handlers ────────────────────────────────────────────────────────────
  const onSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/api/plans', { name: formData.name, description: formData.description, cost: parseInt(formData.cost, 10) });
      toast.success("Plan created successfully");
      setFormData({ name: '', description: '', cost: '' });
      fetchPlansAndSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan");
    } finally { setIsSubmitting(false); }
  };

  const deletePlan = async (id: string) => {
    try {
      await api.delete(`/api/plans/${id}`);
      toast.success("Plan removed");
      setPlans(plans.filter(p => p.id !== id));
    } catch { toast.error("Failed to delete plan"); }
  };

  // ── Checkout hold ────────────────────────────────────────────────────────────
  const handleSaveHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHold(true);
    try {
      await api.post('/api/settings/seat_hold_duration_minutes', { value: holdDuration });
      toast.success("Checkout hold duration saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save hold setting");
    } finally { setIsSavingHold(false); }
  };

  // ── Loyalty grace ────────────────────────────────────────────────────────────
  const handleSaveGrace = async (e: React.FormEvent) => {
    e.preventDefault();
    setGraceError('');
    const b = parseInt(graceBronze), s = parseInt(graceSilver), g = parseInt(graceGold);

    // Client-side validation mirror
    if (!(b <= s && s <= g)) {
      const msg = b > s
        ? `Bronze (${b}d) cannot exceed Silver (${s}d). Increase Silver or reduce Bronze.`
        : `Silver (${s}d) cannot exceed Gold (${g}d). Increase Gold or reduce Silver.`;
      setGraceError(msg);
      toast.error(msg);
      return;
    }

    setIsSavingGrace(true);
    try {
      await api.post('/api/settings/loyalty-grace', {
        bronze_days: b, silver_days: s, gold_days: g,
      });
      toast.success("Loyalty grace periods saved successfully.");
    } catch (err: any) {
      const msg = err.message || "Failed to save loyalty grace settings";
      setGraceError(msg);
      toast.error(msg);
    } finally { setIsSavingGrace(false); }
  };

  // ── Fine amount ──────────────────────────────────────────────────────────────
  const handleSaveFine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFine(true);
    try {
      await api.post('/api/settings/late_payment_fine_amount', { value: fineAmount });
      toast.success("Late payment fine updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save fine amount");
    } finally { setIsSavingFine(false); }
  };

  // ── Transfer Fee ─────────────────────────────────────────────────────────────
  const handleSaveTransferFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTransferFee(true);
    try {
      await api.post('/api/settings/customer_transfer_fee', { value: transferFee });
      toast.success("Transfer fee updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save transfer fee");
    } finally { setIsSavingTransferFee(false); }
  };

  // ── Org Config ───────────────────────────────────────────────────────────────
  const handleSaveOrgConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrgConfig(true);
    try {
      const parsed = JSON.parse(orgConfigRaw);
      await api.post('/api/settings/organizations_config', { value: orgConfigRaw });
      setOrgConfig(parsed);
      toast.success("Organizations configuration updated.");
    } catch (err: any) {
      toast.error(err.message || "Invalid JSON or failed to save configuration");
    } finally { setIsSavingOrgConfig(false); }
  };

  // ── Seat generator ───────────────────────────────────────────────────────────
  const handleGenerateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res: any = await api.post('/api/seats/generate', {
        organization: generatorData.organization,
        sub_organization: generatorData.sub_organization,
        prefix: generatorData.prefix,
        count: parseInt(generatorData.count, 10),
      });
      toast.success(res.message || `Generated ${generatorData.count} seats.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate seats.");
    } finally { setIsGenerating(false); }
  };

  const handleSubOrgChange = (subOrg: string) => {
    const prefixMap: Record<string, string> = {
      'Premium Zone': 'TL-PM-', 'General Area': 'TL-GA-', 'Reading Room': 'TL-RR-',
    };
    setGeneratorData({ ...generatorData, sub_organization: subOrg, prefix: prefixMap[subOrg] || 'TL-' });
  };

  // ── Computed cascade feedback ─────────────────────────────────────────────────
  const b = parseInt(graceBronze || '0'), s = parseInt(graceSilver || '0'), g = parseInt(graceGold || '0');
  const cascadeOk = !isNaN(b) && !isNaN(s) && !isNaN(g) && b <= s && s <= g;

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <SettingsIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground">Manage subscription plans, loyalty tiers, hold windows, and late-fee rules.</p>
        </div>
      </div>

      {/* ── SECTION 1: Plans ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 shadow-sm shadow-black/5 border-border/50 h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add New Plan
              </CardTitle>
              <CardDescription>Create a billing tier shown to customers at checkout.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitPlan} className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input required placeholder="e.g., Monthly Premium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cost (₹ / month)</Label>
                  <Input required type="number" placeholder="1500" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="What's included in this plan?" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Plan
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm shadow-black/5 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Active Plans</CardTitle>
              <CardDescription>These tiers are shown to customers during seat checkout and renewal.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : plans.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-xl border-border/50">
                  <p className="text-muted-foreground font-medium">No plans configured yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {plans.map(plan => (
                    <div key={plan.id} className="p-4 rounded-xl border border-border/50 bg-card/50 flex items-center justify-between group">
                      <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          {plan.name}
                          <span className="text-xs font-black uppercase bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full flex items-center">
                            <IndianRupee className="h-3 w-3 mr-0.5" />{plan.cost}
                          </span>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{plan.description || "No description provided."}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deletePlan(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 2: Seat Hold + Late Fine ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Payment Windows & Penalties
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Checkout Hold */}
          <Card className="shadow-sm shadow-black/5 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5 text-orange-500" />
                Checkout Payment Window
              </CardTitle>
              <CardDescription>
                How long a new customer's seat is held in <span className="font-semibold text-foreground">pending</span> state after clicking "Book",
                waiting for payment to arrive. If payment is not received within this window, the seat is automatically released back to public.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfoBanner
                icon={Info}
                color="blue"
                text="This is NOT the loyalty renewal window. Loyalty grace periods are configured separately below."
              />
              <form onSubmit={handleSaveHold} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Hold Duration
                    <span className="text-xs text-muted-foreground font-normal">(1 – 60 minutes)</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      required type="number" min="1" max="60"
                      placeholder="15" value={holdDuration}
                      onChange={e => setHoldDuration(e.target.value)}
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Default: <strong>15 min</strong>. Typical range is 10–30 min. Must be between 1 and 60 min.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isSavingHold}>
                  {isSavingHold ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  Save Checkout Window
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Late Payment Fine */}
          <Card className="shadow-sm shadow-black/5 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-red-500" />
                Late Payment Fine Amount
              </CardTitle>
              <CardDescription>
                The penalty amount applied to customers who pay their monthly renewal <span className="font-semibold text-foreground">after</span> the
                grace period but before full seat release. This is at admin discretion — they can waive it or enforce it per customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfoBanner
                icon={AlertCircle}
                color="amber"
                text="Fines are optional. Admins can choose to waive the fine for loyal customers on a case-by-case basis."
              />
              <form onSubmit={handleSaveFine} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Fine Amount
                    <span className="text-xs text-muted-foreground font-normal">(₹)</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      required type="number" min="0"
                      placeholder="250" value={fineAmount}
                      onChange={e => setFineAmount(e.target.value)}
                      className="max-w-[140px]"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Default: <strong>₹250</strong>. Set to 0 to disable automatic fine calculations.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isSavingFine}>
                  {isSavingFine ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />}
                  Save Fine Configuration
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer Fee */}
          <Card className="shadow-sm shadow-black/5 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-purple-500" />
                Customer Transfer Fee
              </CardTitle>
              <CardDescription>
                The one-time administrative fee applied when a customer transfers their membership to a different organization or branch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfoBanner
                icon={Info}
                color="blue"
                text="Set to 0 to allow free transfers. If > 0, an automatic pending bill will be generated upon transfer."
              />
              <form onSubmit={handleSaveTransferFee} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Fee Amount
                    <span className="text-xs text-muted-foreground font-normal">(₹)</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      required type="number" min="0"
                      placeholder="500" value={transferFee}
                      onChange={e => setTransferFee(e.target.value)}
                      className="max-w-[140px]"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSavingTransferFee}>
                  {isSavingTransferFee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />}
                  Save Transfer Fee
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 3: Loyalty Grace Days ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Loyalty Seat Retention Grace Periods
        </h2>
        <Card className="shadow-sm shadow-black/5 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Renewal Grace Days by Loyalty Tier
            </CardTitle>
            <CardDescription>
              After a customer's monthly subscription expires, their seat is held <span className="font-semibold text-foreground">exclusively for them</span> for
              this many days before it is released to the public. Higher-loyalty customers get more time. 
              The system enforces: <span className="font-semibold text-foreground">Bronze ≤ Silver ≤ Gold</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <InfoBanner
              icon={ShieldCheck}
              color="green"
              text="These are seat-retention windows AFTER expiry — completely separate from the checkout payment hold above. A Bronze customer with 2 grace days has 2 days after their month ends to renew, with no one else able to book their seat during that window."
            />

            <form onSubmit={handleSaveGrace} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Bronze */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-700" />
                    Bronze Tier Grace
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      required type="number" min="1" max="30"
                      value={graceBronze}
                      onChange={e => { setGraceBronze(e.target.value); setGraceError(''); }}
                      className={`max-w-[100px] ${!isNaN(b) && !isNaN(s) && b > s ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Customers with 1–3 months tenure.</p>
                </div>

                {/* Silver */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-slate-400" />
                    Silver Tier Grace
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      required type="number" min="1" max="30"
                      value={graceSilver}
                      onChange={e => { setGraceSilver(e.target.value); setGraceError(''); }}
                      className={`max-w-[100px] ${!isNaN(s) && !isNaN(g) && s > g ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Customers with 4–11 months tenure.</p>
                </div>

                {/* Gold */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
                    Gold Tier Grace
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      required type="number" min="1" max="30"
                      value={graceGold}
                      onChange={e => { setGraceGold(e.target.value); setGraceError(''); }}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Customers with 12+ months tenure.</p>
                </div>
              </div>

              {/* Live cascade validation indicator */}
              <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-colors ${
                cascadeOk
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}>
                {cascadeOk
                  ? <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                }
                {cascadeOk
                  ? `Sequence valid: Bronze (${b}d) ≤ Silver (${s}d) ≤ Gold (${g}d) ✓`
                  : graceError || `Invalid sequence: Bronze must be ≤ Silver ≤ Gold.`
                }
              </div>

              <Button type="submit" className="w-full" disabled={isSavingGrace || !cascadeOk}>
                {isSavingGrace ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Award className="h-4 w-4 mr-2" />}
                Save Loyalty Grace Configuration
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 4: Organization & Seat Management ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Organizations & Seat Management
        </h2>
        
        {/* Dynamic Organization Configuration */}
        <Card className="shadow-sm shadow-black/5 border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-indigo-500" />
              Organizations & Zones JSON
            </CardTitle>
            <CardDescription>
              Configure the branches and available sub-organizations globally.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <form onSubmit={handleSaveOrgConfig} className="space-y-4">
                <Textarea 
                  className="font-mono text-sm h-48"
                  value={orgConfigRaw}
                  onChange={e => setOrgConfigRaw(e.target.value)}
                  placeholder='{"Trisha Library": ["Premium Zone"]}'
                />
                <Button type="submit" className="w-full" disabled={isSavingOrgConfig}>
                  {isSavingOrgConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SettingsIcon className="h-4 w-4 mr-2" />}
                  Save Configuration
                </Button>
             </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm shadow-black/5 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Bulk Seat Generator</CardTitle>
            <CardDescription>Pre-create sequential, uniquely numbered seats for a sub-organization zone.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateSeats} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={generatorData.organization}
                    onChange={e => {
                       const org = e.target.value;
                       const subOrgs = orgConfig[org] || [];
                       setGeneratorData({ ...generatorData, organization: org, sub_organization: subOrgs[0] || '' });
                    }}
                  >
                    {Object.keys(orgConfig).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Sub-organization / Zone</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={generatorData.sub_organization}
                    onChange={e => setGeneratorData({...generatorData, sub_organization: e.target.value})}
                  >
                    {(orgConfig[generatorData.organization] || []).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seat Number Prefix</Label>
                  <Input required placeholder="TL-PM-" value={generatorData.prefix} onChange={e => setGeneratorData({ ...generatorData, prefix: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity to Generate</Label>
                  <Input required type="number" min="1" max="200" placeholder="10" value={generatorData.count} onChange={e => setGeneratorData({ ...generatorData, count: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Sequential Seats
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

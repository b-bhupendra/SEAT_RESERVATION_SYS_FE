import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, Camera, Loader2, Armchair } from "lucide-react";

interface Seat {
  id: string;
  seat_number: string;
  status: string;
}

interface Plan {
  id: string;
  name: string;
  cost: number;
}

export function RegistrationForm({ 
  onSuccess, 
  isAdmin = false 
}: { 
  onSuccess?: () => void, 
  isAdmin?: boolean 
}) {
  const [loading, setLoading] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profile_photo: '',
    documents: [] as string[],
    organization: 'Trisha Library',
    sub_organization: 'Premium Zone',
    seat_number: '',
    plan_cost: 0
  });

  const [orgConfig, setOrgConfig] = useState<Record<string, string[]>>({
    "Trisha Library": ["Premium Zone", "General Area", "Reading Room"]
  });

  useEffect(() => {
    const fetchPlansAndConfig = async () => {
      try {
        const plansData = await api.get<Plan[]>('/api/plans');
        setPlans(plansData);
        if (plansData.length > 0) {
          setFormData(prev => ({ ...prev, plan_cost: plansData[0].cost }));
        }
        
        const settingsData = await api.get<{organizations_config?: string}>('/api/settings');
        if (settingsData.organizations_config) {
          const parsed = JSON.parse(settingsData.organizations_config);
          setOrgConfig(parsed);
          const orgs = Object.keys(parsed);
          if (orgs.length > 0) {
            const firstOrg = orgs[0];
            const firstSub = parsed[firstOrg][0] || '';
            setFormData(prev => ({ ...prev, organization: firstOrg, sub_organization: firstSub }));
          }
        }
      } catch (err) {
        console.error("Failed to load plans or config", err);
      }
    };
    fetchPlansAndConfig();
  }, []);

  useEffect(() => {
    const fetchAvailableSeats = async () => {
      setLoadingSeats(true);
      try {
        const data = await api.get<Seat[]>(`/api/seats?organization=${formData.organization}&sub_organization=${formData.sub_organization}`);
        const vacant = data.filter(s => s.status === 'available');
        setAvailableSeats(vacant);
        if (vacant.length > 0) {
          setFormData(prev => ({ ...prev, seat_number: vacant[0].seat_number }));
        } else {
          setFormData(prev => ({ ...prev, seat_number: '' }));
        }
      } catch (err) {
        console.error("Failed to load seats", err);
      } finally {
        setLoadingSeats(false);
      }
    };
    fetchAvailableSeats();
  }, [formData.organization, formData.sub_organization]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'profile_photo' | 'documents') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (field === 'profile_photo') {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profile_photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ 
            ...prev, 
            documents: [...prev.documents, reader.result as string] 
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/register', formData);
      if (isAdmin) {
        toast.success("Customer added successfully.");
      } else {
        toast.success("Registration successful! You can now log in.");
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-muted border-4 border-background shadow-sm overflow-hidden flex items-center justify-center">
            {formData.profile_photo ? (
              <img src={formData.profile_photo} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground opacity-50" />
            )}
          </div>
          <Label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
            <Camera className="h-4 w-4" />
          </Label>
          <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profile_photo')} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input 
            required 
            placeholder="John Doe" 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input 
              required 
              type="email" 
              placeholder="john@example.com" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input 
              required 
              placeholder="+1 (555) 000-0000" 
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.organization}
              onChange={(e) => {
                const org = e.target.value;
                const subOrgs = orgConfig[org] || [];
                setFormData(prev => ({...prev, organization: org, sub_organization: subOrgs[0] || ''}));
              }}
            >
              {Object.keys(orgConfig).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Section / Location</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.sub_organization}
              onChange={(e) => setFormData(prev => ({...prev, sub_organization: e.target.value}))}
            >
              {(orgConfig[formData.organization] || []).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Membership Plan</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.plan_cost.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, plan_cost: parseFloat(e.target.value) }))}
            >
              {plans.map(p => (
                <option key={p.id} value={p.cost.toString()}>{p.name} - (₹{p.cost})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Armchair className="h-4 w-4 text-primary" />
              Seat to Hold
            </Label>
            {loadingSeats ? (
              <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableSeats.length === 0 ? (
              <select 
                disabled 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 cursor-not-allowed"
              >
                <option value="">No seats vacant</option>
              </select>
            ) : (
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.seat_number}
                onChange={(e) => setFormData(prev => ({...prev, seat_number: e.target.value}))}
              >
                {availableSeats.map(s => (
                  <option key={s.id} value={s.seat_number}>{s.seat_number}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Identity Documents (Optional)</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e, 'documents')}
            />
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click or drag documents to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.documents.length > 0 
                ? `${formData.documents.length} files attached` 
                : "PDF, JPG, PNG up to 5MB each"}
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
        {loading ? (isAdmin ? "Adding..." : "Registering...") : (isAdmin ? "Add Customer" : "Complete Registration")}
      </Button>
    </form>
  );
}

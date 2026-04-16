import React, { useEffect, useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, Plus, Loader2 } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

import { api, PaginatedResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'view_dashboard', label: 'View Dashboard Analytics' },
  { key: 'manage_reservations', label: 'Create/Edit Reservations' },
  { key: 'manage_customers', label: 'Manage Customer Directory' },
  { key: 'manage_billing', label: 'Access Billing & Invoices' },
  { key: 'manage_roles', label: 'System Role Management' },
  { key: 'view_notifications', label: 'Receive System Notifications' },
  { key: 'view_portal', label: 'Access Customer Workspace' },
  { key: '*', label: 'Superuser (All Access)' },
];

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.get<PaginatedResponse<Role>>(`/api/roles?page=${page}&size=${pageSize}`);
      setRoles(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, pageSize]);

  const handleTogglePermission = (key: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }));
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return;

    setIsSubmitting(true);
    try {
      await api.post('/api/roles', {
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions.join(',')
      });
      setIsDialogOpen(false);
      setNewRole({ name: '', description: '', permissions: [] });
      fetchRoles();
    } catch (err) {
      console.error("Failed to create role:", err);
      alert("Failed to create role. It may already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Manage system roles and their associated permissions.</p>
        </motion.div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-white/10 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role and assign its functional permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRole} className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider opacity-60">Role Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Auditor, Supervisor" 
                    value={newRole.name}
                    onChange={e => setNewRole({...newRole, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider opacity-60">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="What can users in this role do?" 
                    value={newRole.description}
                    onChange={e => setNewRole({...newRole, description: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Permissions</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <div 
                        key={perm.key}
                        onClick={() => handleTogglePermission(perm.key)}
                        className={cn(
                          "p-3 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition-all",
                          newRole.permissions.includes(perm.key)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-white/5 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <span className="font-medium">{perm.label}</span>
                        {newRole.permissions.includes(perm.key) && <ShieldCheck className="h-4 w-4" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="font-bold">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Save Role
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            These roles define what users can see and do in the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : roles.map((role) => (
                <TableRow key={role.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-bold capitalize flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-md",
                      role.name === 'admin' ? "bg-rose-500/10 text-rose-500" :
                      role.name === 'manager' ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                    )}>
                      {role.name === 'admin' ? <ShieldAlert className="h-4 w-4" /> : 
                       role.name === 'manager' ? <ShieldCheck className="h-4 w-4" /> : 
                       <Shield className="h-4 w-4" />}
                    </div>
                    {role.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions === '*' ? (
                        <Badge variant="outline" className="text-rose-500 bg-rose-500/10 border-rose-500/20 text-[10px] font-black tracking-widest uppercase">Full Admin (*)</Badge>
                      ) : role.permissions.split(',').map((p) => (
                        <Badge key={p} variant="secondary" className="text-[9px] uppercase font-bold bg-white/5 border border-white/10">
                          {p.trim().replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-primary hover:bg-primary/10 transition-transform active:scale-95 group-hover:scale-105">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="p-6 border-t border-white/5 bg-black/5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            Showing <span className="text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="text-foreground">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 border-white/10 hover:bg-white/10"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1 font-bold">
               Page {page} <span className="opacity-40">/</span> {totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 border-white/10 hover:bg-white/10"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

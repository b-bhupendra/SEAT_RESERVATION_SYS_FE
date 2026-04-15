import React, { useEffect, useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, Plus } from "lucide-react";

import { api, PaginatedResponse } from "@/lib/api";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Added pagination state for consistency, though usually roles fit in one page
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
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

    fetchRoles();
  }, [page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Manage system roles and their associated permissions.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add New Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            These roles define what users can see and do in the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-bold capitalize flex items-center gap-2">
                    {role.name === 'admin' ? <ShieldAlert className="h-4 w-4 text-destructive" /> : 
                     role.name === 'manager' ? <ShieldCheck className="h-4 w-4 text-primary" /> : 
                     <Shield className="h-4 w-4 text-muted-foreground" />}
                    {role.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.split(',').map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px] uppercase font-bold">
                          {p.trim()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/10 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-primary">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
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

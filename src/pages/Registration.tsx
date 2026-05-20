import React from 'react';
import { motion } from "motion/react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { useNavigate } from 'react-router-dom';

export function Registration() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="border-none shadow-2xl shadow-black/10 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-80" />
            <CardTitle className="text-3xl font-black tracking-tight">Join the Workspace</CardTitle>
            <CardDescription className="text-primary-foreground/70 mt-2">
              Complete your profile to access the facility.
            </CardDescription>
          </div>
          <CardContent className="p-8">
            <RegistrationForm isAdmin={false} onSuccess={() => navigate('/login')} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

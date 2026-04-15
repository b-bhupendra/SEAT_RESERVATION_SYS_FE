import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
}

interface CustomerComboboxProps {
  value: string;
  onChange: (value: string) => void;
  customers: Customer[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function CustomerCombobox({ value, onChange, customers, searchQuery, onSearchQueryChange }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-background"
        >
          {value
            ? customers.find((customer) => customer.id.toString() === value)?.name || "Customer Selected"
            : "Select a customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex border-b px-3 items-center">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type customer name..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {customers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Type to search...</div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-2 pr-8 text-sm outline-none hover:bg-muted focus:bg-muted cursor-pointer transition-colors",
                  value === customer.id.toString() ? "bg-muted font-bold text-primary" : ""
                )}
                onClick={() => {
                  onChange(customer.id.toString());
                  setOpen(false);
                }}
              >
                {customer.name}
                {value === customer.id.toString() && (
                  <Check className="absolute right-2 h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

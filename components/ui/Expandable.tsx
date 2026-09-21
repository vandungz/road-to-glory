"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExpandableProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Shared animated region for accordion and detail disclosures. */
export function Expandable({ open, children, className, id }: ExpandableProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key={id ?? "expandable-content"}
          id={id}
          className={cn("football-expandable", className)}
          initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

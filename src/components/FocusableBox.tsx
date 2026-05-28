/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface FocusableBoxProps {
  children: React.ReactNode;
  focused: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  id?: string;
  key?: string | number;
}

export default function FocusableBox({ children, focused, onClick, className, id }: FocusableBoxProps) {
  return (
    <motion.div
      id={id}
      onClick={onClick}
      data-focused={focused}
      initial={false}
      animate={{
        scale: focused ? 1.02 : 1,
        y: focused ? -4 : 0,
        zIndex: focused ? 10 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative overflow-hidden transition-all duration-500 cursor-pointer rounded overflow-hidden",
        focused 
          ? "focus-ring-premium border-white/40" 
          : "border-white/5",
        "border",
        className
      )}
    >
      {children}
      {focused && (
        <motion.div
          layoutId="focus-border-accent"
          className="absolute inset-[2px] border border-white/20 pointer-events-none rounded-xs"
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.div>
  );
}

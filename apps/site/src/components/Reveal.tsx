'use client';

import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0.001, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number;
  as?: 'div' | 'article' | 'section';
}

export function Reveal({ children, delay = 0, className, amount = 0.05, as = 'div' }: RevealProps) {
  const Cmp = motion[as];
  return (
    <Cmp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Cmp>
  );
}

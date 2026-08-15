'use client';

// Révélation scrubée par le scroll : opacité + translation liées en temps
// réel à la position de l'élément dans le viewport (réversible en remontant).
// Uniquement transform/opacity => compositeur, pas de layout.

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

export function ScrubIn({
  children,
  className,
  distance = 48,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 95%', 'start 60%'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [distance, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

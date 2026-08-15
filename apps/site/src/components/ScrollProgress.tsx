'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });

  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[2px] bg-gradient-to-r from-toxic-500 via-toxic-400 to-toxic-600"
    />
  );
}

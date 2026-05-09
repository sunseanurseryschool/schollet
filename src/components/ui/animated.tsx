"use client";

import { motion, type HTMLMotionProps, type Variants, type Easing } from "framer-motion";
import { type ReactNode } from "react";

// ─── Fade-in page wrapper ────────────────────────────────────────────────────

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Staggered container + child ─────────────────────────────────────────────

const STAGGER_EASE: Easing = [0.25, 0.46, 0.45, 0.94];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: STAGGER_EASE,
    },
  },
};

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Animated card with hover lift ───────────────────────────────────────────

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hover = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={
        hover
          ? {
              y: -2,
              scale: 1.01,
              boxShadow:
                "0 10px 40px -10px rgba(0,0,0,0.1), 0 4px 12px -4px rgba(0,0,0,0.05)",
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated table row ──────────────────────────────────────────────────────

export const tableRowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.03,
      ease: STAGGER_EASE,
    },
  }),
};

// ─── Counter animation (for stat numbers) ────────────────────────────────────

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {prefix}
      {value}
      {suffix}
    </motion.span>
  );
}

// ─── Slide-in from side ──────────────────────────────────────────────────────

export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  className,
}: {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
}) {
  const directionMap = {
    left: { x: -24, y: 0 },
    right: { x: 24, y: 0 },
    up: { x: 0, y: -24 },
    down: { x: 0, y: 24 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Pulse glow for emphasis ─────────────────────────────────────────────────

export function PulseGlow({
  children,
  color = "#2563EB",
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}00`,
          `0 0 0 8px ${color}15`,
          `0 0 0 0 ${color}00`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

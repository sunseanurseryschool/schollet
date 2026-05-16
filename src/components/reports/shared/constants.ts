export const CATEGORY_BAR_COLOR: Record<string, string> = {
  Salary: "bg-rose-400",
  Utilities: "bg-blue-400",
  Maintenance: "bg-orange-400",
  Supplies: "bg-violet-400",
  Transport: "bg-cyan-400",
  Inventory: "bg-emerald-500",
  Rent: "bg-amber-400",
  Other: "bg-slate-400",
};

export const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

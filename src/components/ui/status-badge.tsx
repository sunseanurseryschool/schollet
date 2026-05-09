import {
  PlayCircleIcon,
  PauseCircleIcon,
  ArrowRightCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  AlertTriangleIcon,
  PackageCheckIcon,
  BanknoteIcon,
  SmartphoneIcon,
  BuildingIcon,
  FileTextIcon,
  type LucideIcon,
} from "lucide-react";

type StatusVariant =
  | "active"
  | "inactive"
  | "transferred"
  | "paid"
  | "unpaid"
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "cash"
  | "upi"
  | "bank"
  | "cheque";

interface VariantConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  iconColor: string;
}

const VARIANT_MAP: Record<StatusVariant, VariantConfig> = {
  active: {
    label: "Active",
    icon: PlayCircleIcon,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  inactive: {
    label: "Inactive",
    icon: PauseCircleIcon,
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
    iconColor: "text-slate-500 dark:text-slate-400",
  },
  transferred: {
    label: "Transferred",
    icon: ArrowRightCircleIcon,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2Icon,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  unpaid: {
    label: "Unpaid",
    icon: CircleIcon,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  "in-stock": {
    label: "In Stock",
    icon: PackageCheckIcon,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "low-stock": {
    label: "Low Stock",
    icon: AlertTriangleIcon,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  "out-of-stock": {
    label: "Out of Stock",
    icon: AlertTriangleIcon,
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    iconColor: "text-red-600 dark:text-red-400",
  },
  cash: {
    label: "Cash",
    icon: BanknoteIcon,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  upi: {
    label: "UPI",
    icon: SmartphoneIcon,
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  bank: {
    label: "Bank Transfer",
    icon: BuildingIcon,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  cheque: {
    label: "Cheque",
    icon: FileTextIcon,
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-400",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const cfg = VARIANT_MAP[variant];
  const Icon = cfg.icon;
  const displayLabel = label ?? cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} ${className ?? ""}`}
    >
      <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
      {displayLabel}
    </span>
  );
}

/** Helper to map payment_mode DB values to StatusBadge variants */
export function paymentModeVariant(
  mode: string
): StatusVariant {
  switch (mode) {
    case "CASH":
      return "cash";
    case "UPI":
      return "upi";
    case "BANK_TRANSFER":
      return "bank";
    case "CHEQUE":
      return "cheque";
    default:
      return "cash";
  }
}

/** Helper to map student status to StatusBadge variant */
export function studentStatusVariant(
  status: string
): StatusVariant {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
      return "inactive";
    case "transferred":
      return "transferred";
    default:
      return "active";
  }
}

/** Helper to map inventory stock level to StatusBadge variant */
export function inventoryStockVariant(
  quantity: number,
  minQuantity: number
): StatusVariant {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= minQuantity) return "low-stock";
  return "in-stock";
}

import { cn } from "@dub/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheck,
  CircleHalfDottedCheck,
  CircleHalfDottedClock,
  CircleInfo,
  CircleWarning,
  Icon,
} from "./icons";
import { DynamicTooltipWrapper } from "./tooltip";

const statusBadgeVariants = cva(
  "flex gap-1.5 items-center max-w-fit rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-500/[.15] text-neutral-600",
        new: "bg-[#3971ff]/[.15] text-white",
        success: "bg-green-500/[.15] text-green-600",
        pending: "bg-orange-500/[.15] text-orange-600",
        warning: "bg-yellow-500/[.15] text-yellow-600",
        error: "bg-red-500/[.15] text-red-600",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

const defaultIcons = {
  neutral: CircleInfo,
  new: CircleHalfDottedCheck,
  success: CircleCheck,
  pending: CircleHalfDottedClock,
  warning: CircleWarning,
  error: CircleWarning,
};

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: Icon | null;
  tooltip?: string | React.ReactNode;
}

function StatusBadge({
  className,
  variant,
  icon,
  tooltip,
  onClick,
  children,
  ...props
}: BadgeProps) {
  const Icon =
    icon !== null ? icon ?? defaultIcons[variant ?? "neutral"] : null;

  return (
    <DynamicTooltipWrapper tooltipProps={{ content: tooltip }}>
      <span
        className={cn(
          statusBadgeVariants({ variant }),
          tooltip && "cursor-help",
          onClick &&
            "cursor-pointer select-none transition-[filter] duration-150 hover:brightness-75 hover:saturate-[1.25]",
          className,
        )}
        onClick={onClick}
        {...props}
      >
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {children}
      </span>
    </DynamicTooltipWrapper>
  );
}

export { StatusBadge, statusBadgeVariants };

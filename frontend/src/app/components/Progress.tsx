import * as React from "react";

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number;
    max?: number;
    variant?: "default" | "success" | "warning" | "danger";
  }
>(({ className = "", value = 0, max = 100, variant = "default", ...props }, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-amber-500";
      case "danger":
        return "bg-rose-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div
      ref={ref}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
      {...props}
    >
      <div
        className={`h-full w-full flex-1 ${getVariantClass()} transition-all`}
        style={{ transform: `translateX(-${100 - (value / max) * 100}%)` }}
      />
    </div>
  );
});

Progress.displayName = "Progress";

export { Progress };
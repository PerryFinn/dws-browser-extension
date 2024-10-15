import * as React from "react";

import { cn } from "@/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(({ className, ...props }, ref) => {
  return (
    <div className={cn("divider", className)} ref={ref} {...props}>
      {props.children}
    </div>
  );
});
Divider.displayName = "Divider";

export { Divider };

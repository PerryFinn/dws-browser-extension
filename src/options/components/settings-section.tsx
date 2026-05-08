import clsx from "clsx";
import type { ReactNode } from "react";
import { FieldGroup, Fieldset, Legend } from "@/components/catalyst-ui-kit/fieldset";
import { Text } from "@/components/catalyst-ui-kit/text";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SettingsSection({ title, description, children, className, contentClassName }: SettingsSectionProps) {
  return (
    <section
      className={clsx(
        "relative border-b border-zinc-200/80 pb-8 pl-5 last:border-b-0 last:pb-0 dark:border-white/15",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0.5 h-10 w-1 rounded-full bg-blue-500/70 dark:bg-blue-400/70"
      />
      <Fieldset>
        <Legend>{title}</Legend>
        <Text className="max-w-3xl">{description}</Text>
        <FieldGroup className={clsx("max-w-3xl", contentClassName)}>{children}</FieldGroup>
      </Fieldset>
    </section>
  );
}

import { useBlocker } from "@tanstack/react-router";

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  confirmMessage?: string;
}

const defaultConfirmMessage = "当前页面有未保存的修改，离开后会丢失。确定继续离开吗？";

export const useUnsavedChangesGuard = ({
  isDirty,
  confirmMessage = defaultConfirmMessage
}: UseUnsavedChangesGuardOptions) => {
  useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: () => isDirty,
    shouldBlockFn: () => window.confirm(confirmMessage)
  });
};

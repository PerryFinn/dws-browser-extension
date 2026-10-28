import { disableGitlabSearchAutocomplete, observeGitlabAbsoluteTimes } from "@/contents/gitlab-ux-optimize";
import type { StorageCallbackMap } from "@/lib/extension-storage";
import { localStorageInitialValue, storage } from "@/storages";

export default defineContentScript({
  matches: ["https://gitlab.gz.cvte.cn/*"],
  runAt: "document_end",
  async main(ctx) {
    disableGitlabSearchAutocomplete();

    const defaultEnabled = localStorageInitialValue.gitlabAbsoluteTimeEnabled.defaultValue;
    const enabled = await storage.get<boolean>("gitlabAbsoluteTimeEnabled");
    if (ctx.isInvalid) {
      return;
    }

    let stopObserving: (() => void) | undefined;
    const setEnabled = (value: boolean) => {
      if (value) {
        stopObserving ??= observeGitlabAbsoluteTimes();
      } else {
        stopObserving?.();
        stopObserving = undefined;
      }
    };
    const callbacks: StorageCallbackMap = {
      gitlabAbsoluteTimeEnabled: ({ newValue }) => setEnabled((newValue as boolean | undefined) ?? defaultEnabled)
    };
    storage.watch(callbacks);
    ctx.onInvalidated(() => {
      storage.unwatch(callbacks);
      stopObserving?.();
    });
    setEnabled(enabled ?? defaultEnabled);
  }
});

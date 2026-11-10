import { type Dispatch, type SetStateAction, useCallback, useEffect, useEffectEvent, useState } from "react";
import type { Storage, StorageCallbackMap } from "@/lib/extension-storage";

export interface UseDraftedStorageValueOptions<T> {
  storage: Storage;
  storageKey: string;
  defaultValue: T;
  isEqual?: (savedValue: T, draftValue: T) => boolean;
}

interface DraftStorageState<T> {
  status: "hydrating" | "ready" | "saving";
  savedValue: T;
  draftValue: T;
}

export const useDraftedStorageValue = <T>({
  storage,
  storageKey,
  defaultValue,
  isEqual = Object.is
}: UseDraftedStorageValueOptions<T>) => {
  const [state, setState] = useState<DraftStorageState<T>>({
    status: "hydrating",
    savedValue: defaultValue,
    draftValue: defaultValue
  });
  const { status, savedValue, draftValue } = state;

  const applyStorageUpdate = useEffectEvent((nextValue: T) => {
    setState((current) => ({
      ...current,
      savedValue: nextValue,
      draftValue:
        current.status !== "hydrating" && !isEqual(current.savedValue, current.draftValue)
          ? current.draftValue
          : nextValue
    }));
  });

  useEffect(() => {
    let isActive = true;
    let hasObservedStorageUpdateDuringHydration = false;
    const callbackMap: StorageCallbackMap = {
      [storageKey]: ({ newValue }) => {
        if (!isActive) {
          return;
        }

        hasObservedStorageUpdateDuringHydration = true;
        const nextValue = (typeof newValue === "undefined" ? defaultValue : newValue) as T;
        applyStorageUpdate(nextValue);
      }
    };

    setState((current) => ({ ...current, status: "hydrating" }));
    storage.watch(callbackMap);

    const finishHydration = (storedValue?: T) => {
      if (!isActive) return;
      const nextValue = typeof storedValue === "undefined" ? defaultValue : storedValue;
      setState((current) =>
        hasObservedStorageUpdateDuringHydration
          ? { ...current, status: "ready" }
          : { status: "ready", savedValue: nextValue, draftValue: nextValue }
      );
    };
    void storage
      .get<T>(storageKey)
      .then(finishHydration)
      .catch(() => finishHydration());

    return () => {
      isActive = false;
      storage.unwatch(callbackMap);
    };
  }, [defaultValue, storage, storageKey]);

  const setDraftValue = useCallback<Dispatch<SetStateAction<T>>>((valueOrUpdater) => {
    setState((current) => ({
      ...current,
      draftValue:
        typeof valueOrUpdater === "function" ? (valueOrUpdater as (value: T) => T)(current.draftValue) : valueOrUpdater
    }));
  }, []);

  const resetDraft = () => {
    setState((current) => ({ ...current, draftValue: current.savedValue }));
  };

  const saveDraft = async () => {
    setState((current) => ({ ...current, status: "saving" }));

    try {
      await storage.set(storageKey, draftValue);
      setState((current) => ({ ...current, savedValue: draftValue }));
      return draftValue;
    } finally {
      setState((current) => ({ ...current, status: "ready" }));
    }
  };

  return {
    savedValue,
    draftValue,
    setDraftValue,
    status,
    isHydrated: status !== "hydrating",
    isSaving: status === "saving",
    isDirty: status !== "hydrating" && !isEqual(savedValue, draftValue),
    resetDraft,
    saveDraft
  };
};

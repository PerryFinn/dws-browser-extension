import { useEffect, useMemo, useRef, useState } from "react";
import type { Storage, StorageCallbackMap } from "@/lib/extension-storage";

export interface UseDraftedStorageValueOptions<T> {
  storage: Storage;
  storageKey: string;
  defaultValue: T;
  isEqual?: (savedValue: T, draftValue: T) => boolean;
}

export const useDraftedStorageValue = <T>({
  storage,
  storageKey,
  defaultValue,
  isEqual = Object.is
}: UseDraftedStorageValueOptions<T>) => {
  const [savedValue, setSavedValue] = useState<T>(defaultValue);
  const [draftValue, setDraftValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isHydrated && !isEqual(savedValue, draftValue);
  }, [draftValue, isEqual, isHydrated, savedValue]);

  useEffect(() => {
    let isActive = true;
    let isHydrationComplete = false;
    let hasObservedStorageUpdateDuringHydration = false;
    const callbackMap: StorageCallbackMap = {
      [storageKey]: ({ newValue }) => {
        if (!isActive) {
          return;
        }

        if (!isHydrationComplete) {
          hasObservedStorageUpdateDuringHydration = true;
        }

        const nextValue = (typeof newValue === "undefined" ? defaultValue : newValue) as T;
        setSavedValue(nextValue);

        if (!isDirtyRef.current) {
          setDraftValue(nextValue);
        }
      }
    };

    setIsHydrated(false);
    storage.watch(callbackMap);

    void storage
      .get(storageKey)
      .then((storedValue) => {
        if (!isActive) {
          return;
        }

        if (!hasObservedStorageUpdateDuringHydration) {
          const nextValue = (typeof storedValue === "undefined" ? defaultValue : storedValue) as T;
          setSavedValue(nextValue);
          setDraftValue(nextValue);
        }

        isHydrationComplete = true;
        setIsHydrated(true);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        if (!hasObservedStorageUpdateDuringHydration) {
          setSavedValue(defaultValue);
          setDraftValue(defaultValue);
        }

        isHydrationComplete = true;
        setIsHydrated(true);
      });

    return () => {
      isActive = false;
      storage.unwatch(callbackMap);
    };
  }, [defaultValue, storage, storageKey]);

  const isDirty = useMemo(() => {
    return isHydrated && !isEqual(savedValue, draftValue);
  }, [draftValue, isEqual, isHydrated, savedValue]);

  const resetDraft = () => {
    setDraftValue(savedValue);
  };

  const saveDraft = async () => {
    setIsSaving(true);

    try {
      await storage.set(storageKey, draftValue);
      setSavedValue(draftValue);
      setDraftValue(draftValue);
      return draftValue;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    savedValue,
    draftValue,
    setDraftValue,
    isHydrated,
    isSaving,
    isDirty,
    resetDraft,
    saveDraft
  };
};

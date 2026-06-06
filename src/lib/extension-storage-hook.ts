import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Storage, type StorageCallbackMap } from "./extension-storage";

type UseStorageOptions = {
  key: string;
  instance?: Storage;
};

type UseStorageSetter<T> = (value: SetStateAction<T>) => Promise<T>;

type UseStorageState<T> = {
  isLoading: boolean;
  setStoreValue: UseStorageSetter<T>;
};

const defaultStorage = new Storage({ area: "local" });

const resolveOptions = (options: string | UseStorageOptions): Required<UseStorageOptions> => {
  if (typeof options === "string") {
    return {
      key: options,
      instance: defaultStorage
    };
  }

  return {
    key: options.key,
    instance: options.instance ?? defaultStorage
  };
};

export const useStorage = <T>(
  options: string | UseStorageOptions,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>, UseStorageState<T>] => {
  const { key, instance } = useMemo(() => resolveOptions(options), [options]);
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let isActive = true;
    const callbackMap: StorageCallbackMap = {
      [key]: ({ newValue }) => {
        if (!isActive) {
          return;
        }

        const nextValue = typeof newValue === "undefined" ? defaultValue : (newValue as T);
        valueRef.current = nextValue;
        setValue(nextValue);
      }
    };

    setIsLoading(true);
    instance.watch(callbackMap);

    void instance
      .get<T>(key)
      .then((storedValue) => {
        if (!isActive) {
          return;
        }

        const nextValue = typeof storedValue === "undefined" ? defaultValue : storedValue;
        valueRef.current = nextValue;
        setValue(nextValue);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        valueRef.current = defaultValue;
        setValue(defaultValue);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      instance.unwatch(callbackMap);
    };
  }, [defaultValue, instance, key]);

  const setStoreValue = useCallback<UseStorageSetter<T>>(
    async (valueOrUpdater) => {
      const nextValue =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (currentValue: T) => T)(valueRef.current)
          : valueOrUpdater;

      valueRef.current = nextValue;
      setValue(nextValue);
      await instance.set(key, nextValue);
      return nextValue;
    },
    [instance, key]
  );

  const state = useMemo<UseStorageState<T>>(
    () => ({
      isLoading,
      setStoreValue
    }),
    [isLoading, setStoreValue]
  );

  return [value, setStoreValue as Dispatch<SetStateAction<T>>, state];
};

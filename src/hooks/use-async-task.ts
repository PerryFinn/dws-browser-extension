import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncTaskState<T> =
  | { status: "idle" | "pending"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

type AsyncTaskCompletion<T> = { status: "success"; data: T } | { status: "error"; error: string };

/** 只接收最近一次任务；失效任务返回 undefined，调用方也应跳过 toast、历史等副作用。 */
export const useAsyncTask = <T>({ keepPreviousData = false }: { keepPreviousData?: boolean } = {}) => {
  const [state, setState] = useState<AsyncTaskState<T>>({ status: "idle", data: null, error: null });
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );

  const reset = useCallback(() => {
    requestId.current += 1;
    setState({ status: "idle", data: null, error: null });
  }, []);

  const run = useCallback(
    async (task: () => Promise<T>): Promise<AsyncTaskCompletion<T> | undefined> => {
      const id = ++requestId.current;
      setState((current) => ({ status: "pending", data: keepPreviousData ? current.data : null, error: null }));

      try {
        const data = await task();
        if (id !== requestId.current) return undefined;
        setState({ status: "success", data, error: null });
        return { status: "success", data };
      } catch (reason) {
        if (id !== requestId.current) return undefined;
        const error = reason instanceof Error ? reason.message : String(reason);
        setState((current) => ({ status: "error", data: current.data, error }));
        return { status: "error", error };
      }
    },
    [keepPreviousData]
  );

  return { state, run, reset };
};

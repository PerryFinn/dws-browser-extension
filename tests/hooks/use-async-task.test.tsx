import { act } from "react";
import { expect, test } from "vitest";
import { useAsyncTask } from "@/hooks/use-async-task";
import { deferred, renderHook } from "../helpers/react";

test("任务开始清理上次错误，失败可重试，成功整体替换结果", async () => {
  const hook = await renderHook(() => useAsyncTask<string>());
  try {
    expect(hook.current().state).toEqual({ status: "idle", data: null, error: null });
    await act(async () => {
      await hook.current().run(async () => {
        throw new Error("服务不可用");
      });
    });
    expect(hook.current().state).toEqual({ status: "error", data: null, error: "服务不可用" });
    const request = deferred<string>();
    let completion: ReturnType<ReturnType<typeof useAsyncTask<string>>["run"]>;
    await act(async () => {
      completion = hook.current().run(() => request.promise);
    });
    expect(hook.current().state).toEqual({ status: "pending", data: null, error: null });
    await act(async () => {
      request.resolve("新结果");
      expect(await completion).toEqual({ status: "success", data: "新结果" });
    });
    expect(hook.current().state).toEqual({ status: "success", data: "新结果", error: null });
  } finally {
    await hook.cleanup();
  }
});

test.each(["resolve", "reject"] as const)("旧任务 %s 时保留最新任务的 pending 状态", async (settle) => {
  const hook = await renderHook(() => useAsyncTask<string>());
  const first = deferred<string>();
  const second = deferred<string>();
  let firstCompletion!: ReturnType<ReturnType<typeof useAsyncTask<string>>["run"]>;
  let secondCompletion!: typeof firstCompletion;
  try {
    await act(async () => {
      firstCompletion = hook.current().run(() => first.promise);
    });
    await act(async () => {
      secondCompletion = hook.current().run(() => second.promise);
    });
    await act(async () => {
      if (settle === "resolve") first.resolve("旧结果");
      else first.reject(new Error("旧错误"));
      expect(await firstCompletion).toBeUndefined();
    });
    expect(hook.current().state).toEqual({ status: "pending", data: null, error: null });
    await act(async () => {
      second.resolve("最新结果");
      await secondCompletion;
    });
    expect(hook.current().state.data).toBe("最新结果");
  } finally {
    await hook.cleanup();
  }
});

test("保留数据模式在重试和失败时保留最近成功结果", async () => {
  const hook = await renderHook(() => useAsyncTask<string>({ keepPreviousData: true }));
  try {
    await act(async () => {
      await hook.current().run(async () => "上次结果");
    });
    const next = deferred<string>();
    let completion!: ReturnType<ReturnType<typeof useAsyncTask<string>>["run"]>;
    await act(async () => {
      completion = hook.current().run(() => next.promise);
    });
    expect(hook.current().state).toEqual({ status: "pending", data: "上次结果", error: null });
    await act(async () => {
      next.reject(new Error("重试失败"));
      await completion;
    });
    expect(hook.current().state).toEqual({ status: "error", data: "上次结果", error: "重试失败" });
  } finally {
    await hook.cleanup();
  }
});

test.each(["reset", "unmount"] as const)("%s 使未完成任务失效", async (action) => {
  const hook = await renderHook(() => useAsyncTask<string>());
  const pending = deferred<string>();
  let completion!: ReturnType<ReturnType<typeof useAsyncTask<string>>["run"]>;
  await act(async () => {
    completion = hook.current().run(() => pending.promise);
  });
  if (action === "unmount") await hook.cleanup();
  else await act(async () => hook.current().reset());
  try {
    await act(async () => {
      pending.resolve("失效结果");
      expect(await completion).toBeUndefined();
    });
    if (action === "reset") expect(hook.current().state.status).toBe("idle");
  } finally {
    if (action === "reset") await hook.cleanup();
  }
});

import { act } from "react";
import { expect, test, vi } from "vitest";
import { Storage, type StorageCallbackMap } from "@/lib/extension-storage";
import { useStorage } from "@/lib/extension-storage-hook";
import { deferred, renderHook } from "../helpers/react";

test.each(["resolve", "reject"] as const)("初始读取 %s 后不覆盖加载期间收到的最新存储值", async (settle) => {
  const storage = new Storage();
  const initialRead = deferred<string>();
  let callbacks!: StorageCallbackMap;
  vi.spyOn(storage, "get").mockReturnValue(initialRead.promise);
  vi.spyOn(storage, "watch").mockImplementation((next) => {
    callbacks = next;
  });
  const unwatch = vi.spyOn(storage, "unwatch").mockImplementation(() => {});
  const hook = await renderHook(() => useStorage({ key: "setting", instance: storage }, "default"));
  try {
    expect(hook.current()[2].isLoading).toBe(true);
    await act(async () => callbacks.setting?.({ newValue: "最新配置" }));
    await act(async () => {
      if (settle === "resolve") initialRead.resolve("过期配置");
      else initialRead.reject(new Error("读取失败"));
    });
    expect(hook.current()[0]).toBe("最新配置");
    expect(hook.current()[2].isLoading).toBe(false);
  } finally {
    await hook.cleanup();
  }
  expect(unwatch).toHaveBeenCalledWith(callbacks);
});

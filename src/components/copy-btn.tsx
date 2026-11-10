import { Check, Copy } from "lucide-react";
import { type MouseEventHandler, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAsyncTask } from "@/hooks/use-async-task";
import { copyToClipboard } from "@/utils";

const CopyButton: React.FC<{ text?: string }> = ({ text }) => {
  const { state, run, reset } = useAsyncTask<void>();
  const copied = state.status === "success";
  const isCopying = state.status === "pending";
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(reset, 1000);
    return () => clearTimeout(timer);
  }, [copied, reset]);
  const handleCopy: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (copied || isCopying || typeof text !== "string") return;
      const outcome = await run(async () => {
        if (!(await copyToClipboard(text))) throw new Error("复制失败，请重试");
      });
      if (outcome?.status === "error") {
        console.error("CopyButton 发生了错误: ", outcome.error);
      }
    },
    [text, copied, isCopying, run]
  );

  return (
    <Button
      size="icon"
      aria-label={copied ? "已复制" : "复制"}
      disabled={isCopying}
      className="text-xs/5 text-gray-500 hover:text-gray-700 size-fit bg-transparent hover:bg-transparent disabled:pointer-events-auto"
      onClick={handleCopy}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </Button>
  );
};

export default CopyButton;

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/utils";
import { Check, Copy } from "lucide-react";
import { type MouseEventHandler, useCallback, useState } from "react";

const CopyButton: React.FC<{ text?: string }> = ({ text }) => {
  const [copied, setCopiedState] = useState(false);
  const handleCopy: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        if (copied || typeof text !== "string") return;
        await copyToClipboard(text);
        setCopiedState(true);
        setTimeout(() => {
          setCopiedState(false);
        }, 1000);
      } catch (error) {
        console.error("CopyButton 发生了错误: ", error);
      }
    },
    [text, copied]
  );

  return (
    <Button
      size="icon"
      className="text-xs/5 text-gray-500 hover:text-gray-700 size-fit bg-transparent hover:bg-transparent"
      onClick={handleCopy}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </Button>
  );
};

export default CopyButton;

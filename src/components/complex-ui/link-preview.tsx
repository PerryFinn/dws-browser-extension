import { cn } from "@/utils";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { encode } from "qss";
import React from "react";

type LinkPreviewProps = {
  children: React.ReactNode;
  url?: string;
  className?: string;
  width?: number;
  height?: number;
  type: "img" | "video";
  side?: "left" | "right" | "top" | "bottom";
  align?: "center" | "end" | "start";
  desc?: string;
  isStatic?: boolean;
  loop?: boolean;
};

export const LinkPreview = ({
  children,
  url,
  className,
  width = 200,
  type = "img",
  height = 125,
  isStatic = false,
  side = "right",
  align = "center",
  desc = "图片描述",
  loop = true
}: LinkPreviewProps) => {
  const isImg = type === "img";
  let src: string | undefined;
  if (!isStatic && isImg) {
    const params = encode({
      url,
      screenshot: true,
      meta: false,
      embed: "screenshot.url",
      colorScheme: "dark",
      "viewport.isMobile": true,
      "viewport.deviceScaleFactor": 1,
      "viewport.width": width * 3,
      "viewport.height": height * 3
    });
    src = `https://api.microlink.io/?${params}`;
  } else {
    src = url;
  }

  const [isOpen, setOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);

  const translateX = useSpring(x, springConfig);

  const handleMouseMove = (event: any) => {
    const targetRect = event.target.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2; // Reduce the effect to make it subtle
    x.set(offsetFromCenter);
  };

  return (
    <>
      {isMounted && isImg ? (
        <div className="hidden">
          <img src={src} width={width} height={height} alt={desc} />
        </div>
      ) : null}

      <HoverCardPrimitive.Root openDelay={50} closeDelay={100} onOpenChange={setOpen}>
        <HoverCardPrimitive.Trigger
          onMouseMove={handleMouseMove}
          className={cn("text-black dark:text-white cursor-pointer", className)}
          href={url}
        >
          {children}
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Content
          className="[transform-origin:var(--radix-hover-card-content-transform-origin)] z-50"
          side={side}
          align={align}
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="shadow-xl rounded-xl z-50"
                style={{ x: translateX }}
              >
                {isImg ? (
                  <img src={src} width={width} height={height} className="rounded-lg" alt={desc} />
                ) : (
                  <video
                    src={src}
                    width={width}
                    height={height}
                    className="rounded-lg"
                    controls={false}
                    muted
                    autoPlay
                    loop={loop}
                  >
                    <track kind="captions" />
                  </video>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Root>
    </>
  );
};

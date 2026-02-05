import { motion } from "framer-motion";
import { PlusIcon, XIcon } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";

import { cn } from "@/utils";

const CONTAINER_SIZE = 200;

// 包装内容并处理动画的容器
interface FamilyButtonContainerProps {
  isExpanded: boolean;
  onClick: () => void;
  children: ReactNode;
}

const FamilyButtonContainer: FC<FamilyButtonContainerProps> = ({ isExpanded, onClick, children }) => {
  return (
    <motion.div
      className={cn(
        "relative border-white/10 border shadow-lg flex flex-col space-y-1 items-center text-white cursor-pointer z-10",
        !isExpanded ? "bg-gradient-to-b from-neutral-900 to-stone-900 dark:from-stone-700 dark:to-neutral-800/80" : ""
      )}
      layoutRoot
      layout
      initial={{ borderRadius: 20, width: "4rem", height: "4rem" }}
      animate={
        isExpanded
          ? {
              borderRadius: 20,
              width: CONTAINER_SIZE,
              height: CONTAINER_SIZE + 50,
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 300,
                when: "beforeChildren"
              }
            }
          : { borderRadius: 20, width: "4rem", height: "4rem" }
      }
    >
      {children}

      <motion.div
        className="absolute"
        initial={{ x: "-50%" }}
        animate={{
          x: isExpanded ? "0%" : "-50%",
          transition: { type: "tween", ease: "easeOut", duration: 0.3 }
        }}
        style={{ left: isExpanded ? "" : "50%", bottom: 6 }}
      >
        {isExpanded ? (
          <motion.div
            className="p-[10px] group bg-neutral-800/50 dark:bg-black/50 border border-cyan-100/30 hover:border-neutral-200  rounded-full shadow-2xl transition-colors duration-300 "
            onClick={onClick}
            layoutId="expand-toggle"
            initial={false}
            animate={{ rotate: -360, transition: { duration: 0.4 } }}
          >
            <XIcon
              className={cn(
                "h-7 w-7 text-black dark:text-neutral-900 group-hover:text-neutral-500 transition-colors duration-200 "
              )}
            />
          </motion.div>
        ) : (
          <motion.div
            className={cn(
              "p-[10px] group bg-neutral-200  text-cyan-50 border border-cyan-100/10 shadow-2xl transition-colors duration-200"
            )}
            style={{ borderRadius: 24 }}
            onClick={onClick}
            layoutId="expand-toggle"
            initial={{ rotate: 180 }}
            animate={{ rotate: -180, transition: { duration: 0.4 } }}
          >
            <PlusIcon className="h-7 w-7 text-black dark:text-neutral-900" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

interface FamilyButtonProps {
  children: React.ReactNode;
}

const FamilyButton: React.FC<FamilyButtonProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <FamilyButtonContainer isExpanded={isExpanded} onClick={toggleExpand}>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { delay: 0.3, duration: 0.4, ease: "easeOut" }
            }}
          >
            {children}
          </motion.div>
        ) : null}
      </FamilyButtonContainer>
    </div>
  );
};

export { FamilyButton };

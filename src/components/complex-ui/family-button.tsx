import { motion } from "framer-motion";
import { PlusIcon, XIcon } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";

import { cn } from "@/utils";

/** 展开后容器的宽度（高度为 CONTAINER_SIZE + 50） */
const CONTAINER_SIZE = 200;

// ─────────────────────────────────────────────
// FamilyButtonContainer —— 负责包裹内容并驱动展开/收起动画的容器
// ─────────────────────────────────────────────

interface FamilyButtonContainerProps {
  /** 当前是否处于展开状态 */
  isExpanded: boolean;
  /** 点击切换按钮时的回调 */
  onClick: () => void;
  /** 展开后显示的内容 */
  children: ReactNode;
}

const FamilyButtonContainer: FC<FamilyButtonContainerProps> = ({ isExpanded, onClick, children }) => {
  return (
    /**
     * 1. 外层容器 —— 控制整体尺寸与展开/收起的弹簧动画
     *    - 收起状态：4rem × 4rem 的圆角小按钮，带渐变背景
     *    - 展开状态：200px × 250px 的面板，背景渐变移除
     *    - layoutRoot + layout 启用 Framer Motion 的自动布局动画
     */
    <motion.div
      className={cn(
        "relative border-white/10 border shadow-lg flex flex-col space-y-1 items-center text-white cursor-pointer z-10",
        // 收起时添加渐变背景，展开时去掉（让内容区域自行展示）
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
                type: "spring", // 使用弹簧物理动画
                damping: 25, // 阻尼系数，控制回弹幅度
                stiffness: 300, // 刚度，数值越大弹簧越硬、动画越快
                when: "beforeChildren" // 容器动画先于子元素动画执行
              }
            }
          : { borderRadius: 20, width: "4rem", height: "4rem" }
      }
    >
      {/* 2. 展开后的用户自定义内容区域（由 FamilyButton 传入） */}
      {children}

      {/**
       * 3. 底部切换按钮的定位容器
       *    - 收起时：水平居中（left: 50%, translateX: -50%）
       *    - 展开时：取消居中偏移，回到默认位置
       *    - 使用 tween 缓动动画平滑过渡位置
       */}
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
          /**
           * 4a. 展开状态下的关闭按钮（X 图标）
           *     - 半透明深色背景 + 青色边框，hover 时边框变亮
           *     - layoutId="expand-toggle" 让 Plus ↔ X 按钮之间产生共享布局过渡动画
           *     - 旋转 -360° 的入场动画，营造"旋转切换"的视觉效果
           */
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
          /**
           * 4b. 收起状态下的展开按钮（Plus 图标）
           *     - 浅色背景（bg-neutral-200），与收起状态的深色容器形成对比
           *     - 同样使用 layoutId="expand-toggle" 与关闭按钮共享过渡动画
           *     - 从 180° 旋转到 -180° 的动画效果
           */
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

// ─────────────────────────────────────────────
// FamilyButton —— 对外暴露的主组件，管理展开/收起状态
// ─────────────────────────────────────────────

interface FamilyButtonProps {
  /** 展开后要展示的自定义内容 */
  children: React.ReactNode;
}

/**
 * FamilyButton 是一个可展开/收起的浮动按钮组件。
 * - 收起时显示为一个带 "+" 图标的小按钮
 * - 点击后展开为一个面板，展示传入的 children 内容
 * - 再次点击关闭按钮（X 图标）收起面板
 */
const FamilyButton: React.FC<FamilyButtonProps> = ({ children }) => {
  /** 控制当前展开/收起状态 */
  const [isExpanded, setIsExpanded] = useState(false);
  /** 切换展开/收起 */
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <FamilyButtonContainer isExpanded={isExpanded} onClick={toggleExpand}>
        {isExpanded ? (
          /**
           * 5. 展开内容的淡入动画
           *    - 延迟 0.3s 后开始（等容器展开动画基本完成）
           *    - 0.4s 的 opacity 渐显，使用 easeOut 缓动
           *    - 收起时直接卸载（返回 null），无退出动画
           */
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

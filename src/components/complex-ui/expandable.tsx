import { cn } from "@/utils";
import {
  AnimatePresence,
  type AnimationControls,
  type HTMLMotionProps,
  type SpringOptions,
  type Target,
  type TargetAndTransition,
  type VariantLabels,
  motion,
  useMotionValue,
  useSpring
} from "framer-motion";
import React, { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import useMeasure from "react-use-measure";

const springConfig: SpringOptions = { stiffness: 200, damping: 20, bounce: 0.2 };

interface ExpandableContextType {
  isExpanded: boolean; // 指示组件是否展开
  toggleExpand: () => void; // 切换展开状态的函数
  expandDirection: "vertical" | "horizontal" | "both"; // 展开的方向
  expandBehavior: "replace" | "push"; // 展开如何影响周围内容
  transitionDuration: number; // 展开/折叠动画的持续时间
  easeType: string; // 动画的缓动函数
  initialDelay: number; // 动画开始前的延迟
  onExpandEnd?: () => void; // 展开结束时的回调函数
  onCollapseEnd?: () => void; // 折叠结束时的回调函数
}

// 创建一个具有默认值的上下文
const ExpandableContext = createContext<ExpandableContextType>({
  isExpanded: false,
  toggleExpand: () => {},
  expandDirection: "vertical", // 展开的方向：'vertical' | 'horizontal' | 'both'
  expandBehavior: "replace", // 展开如何影响周围内容
  transitionDuration: 0.3, // 展开/折叠动画的持续时间
  easeType: "easeInOut", // 动画的缓动函数
  initialDelay: 0 // 动画开始前的延迟
});

// 使用 ExpandableContext 的自定义钩子
const useExpandable = () => useContext(ExpandableContext);

type ExpandablePropsBase = Omit<HTMLMotionProps<"div">, "children">;

interface ExpandableProps extends ExpandablePropsBase {
  children: ReactNode | ((props: { isExpanded: boolean }) => ReactNode);
  expanded?: boolean;
  onToggle?: () => void;
  transitionDuration?: number;
  easeType?: string;
  expandDirection?: "vertical" | "horizontal" | "both";
  expandBehavior?: "replace" | "push";
  initialDelay?: number;
  onExpandStart?: () => void;
  onExpandEnd?: () => void;
  onCollapseStart?: () => void;
  onCollapseEnd?: () => void;
}
// 根 Expand 组件
const Expandable = React.forwardRef<HTMLDivElement, ExpandableProps>(
  (
    {
      children,
      expanded,
      onToggle,
      transitionDuration = 0.3,
      easeType = "easeInOut",
      expandDirection = "vertical",
      expandBehavior = "replace",
      initialDelay = 0,
      onExpandStart,
      onExpandEnd,
      onCollapseStart,
      onCollapseEnd,
      ...props
    },
    ref
  ) => {
    // 当组件未受控时，内部的展开状态
    const [isExpandedInternal, setIsExpandedInternal] = useState(false);

    // 如果提供了 expanded 属性，则使用它，否则使用内部状态
    const isExpanded = expanded !== undefined ? expanded : isExpandedInternal;

    // 如果提供了 onToggle 函数，则使用它，否则使用内部切换函数
    const toggleExpand = onToggle || (() => setIsExpandedInternal((prev) => !prev));

    // 当 isExpanded 变化时调用 onExpandStart 或 onCollapseStart 的效果
    useEffect(() => {
      if (isExpanded) {
        onExpandStart?.();
      } else {
        onCollapseStart?.();
      }
    }, [isExpanded, onExpandStart, onCollapseStart]);

    // 创建要提供给子组件的上下文值
    const contextValue: ExpandableContextType = {
      isExpanded,
      toggleExpand,
      expandDirection,
      expandBehavior,
      transitionDuration,
      easeType,
      initialDelay,
      onExpandEnd,
      onCollapseEnd
    };

    return (
      <ExpandableContext.Provider value={contextValue}>
        <motion.div
          ref={ref}
          initial={false}
          animate={{
            transition: {
              duration: transitionDuration,
              ease: easeType,
              delay: initialDelay
            }
          }}
          {...props}
        >
          {/* 如果提供了 children 作为函数，则渲染它，否则按原样渲染 */}
          {typeof children === "function" ? children({ isExpanded }) : children}
        </motion.div>
      </ExpandableContext.Provider>
    );
  }
);

// 预定义的动画预设
const ANIMATION_PRESETS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  "slide-up": {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3 }
  },
  "slide-down": {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  },
  "slide-left": {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3 }
  },
  "slide-right": {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3 }
  },
  rotate: {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: -10 },
    transition: { duration: 0.3 }
  },
  "blur-sm": {
    initial: { opacity: 0, filter: "blur(4px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(4px)" },
    transition: { duration: 0.3 }
  },
  "blur-md": {
    initial: { opacity: 0, filter: "blur(8px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(8px)" },
    transition: { duration: 0.3 }
  },
  "blur-lg": {
    initial: { opacity: 0, filter: "blur(16px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(16px)" },
    transition: { duration: 0.3 }
  }
};

// 定义自定义动画的属性
interface AnimationProps {
  initial?: boolean | Target | VariantLabels; // 动画的初始状态
  animate?: AnimationControls | TargetAndTransition | VariantLabels | boolean; // 动画的最终状态
  exit?: TargetAndTransition | VariantLabels; // 组件移除时的状态
  transition?: object; // 过渡属性
}

// 将此组件包裹在卡片中希望在展开时隐藏然后动画显示的项目周围
const ExpandableContent = React.forwardRef<
  HTMLDivElement,
  Omit<HTMLMotionProps<"div">, "ref"> & {
    preset?: keyof typeof ANIMATION_PRESETS;
    animateIn?: AnimationProps;
    animateOut?: AnimationProps;
    stagger?: boolean;
    staggerChildren?: number;
    keepMounted?: boolean;
  }
>(
  (
    { children, preset, animateIn, animateOut, stagger = false, staggerChildren = 0.1, keepMounted = false, ...props },
    ref
  ) => {
    const { isExpanded, transitionDuration, easeType } = useExpandable();
    // useMeasure 用于测量内容的高度
    const [measureRef, { height: measuredHeight }] = useMeasure();
    // useMotionValue 创建一个可以平滑动画的值
    const animatedHeight = useMotionValue(0);
    // useSpring 将弹簧动画应用于高度值
    const smoothHeight = useSpring(animatedHeight, springConfig);

    useEffect(() => {
      // 根据内容是展开还是折叠来动画高度
      if (isExpanded) {
        animatedHeight.set(measuredHeight);
      } else {
        animatedHeight.set(0);
      }
    }, [isExpanded, measuredHeight, animatedHeight]);

    const presetAnimation = preset ? ANIMATION_PRESETS[preset] : {};
    const combinedAnimateIn = {
      ...presetAnimation,
      ...animateIn
    };
    const combinedAnimateOut = animateOut || combinedAnimateIn;

    return (
      // 这个 motion.div 动画内容的高度
      <motion.div
        ref={ref}
        style={{
          height: smoothHeight,
          overflow: "hidden"
        }}
        transition={{ duration: transitionDuration, ease: easeType }}
        {...props}
      >
        {/* AnimatePresence 处理组件的进入和退出 */}
        <AnimatePresence initial={false}>
          {(isExpanded || keepMounted) && (
            // 这个 motion.div 处理内容本身的动画
            <motion.div
              ref={measureRef}
              initial={combinedAnimateIn.initial}
              animate={combinedAnimateIn.animate}
              exit={combinedAnimateOut.exit}
              transition={{ duration: transitionDuration, ease: easeType }}
            >
              {stagger ? (
                // 如果 stagger 为 true，我们对子组件应用交错动画
                <motion.div
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: staggerChildren
                      }
                    }
                  }}
                  initial="hidden"
                  animate="visible"
                >
                  {React.Children.map(children as React.ReactNode, (child, index) => (
                    <motion.div
                      key={(child as React.ReactElement).key || index || undefined}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                    >
                      {child}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                children
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

interface ExpandableCardProps {
  children: ReactNode;
  className?: string;
  collapsedSize?: { width?: number; height?: number }; // 折叠时的尺寸
  expandedSize?: { width?: number; height?: number }; // 展开时的尺寸
  hoverToExpand?: boolean; // 是否在悬停时展开
  expandDelay?: number; // 展开前的延迟
  collapseDelay?: number; // 折叠前的延迟
}

const ExpandableCard = React.forwardRef<HTMLDivElement, ExpandableCardProps>(
  (
    {
      children,
      className = "",
      collapsedSize = { width: 320, height: 211 },
      expandedSize = { width: 480, height: undefined },
      hoverToExpand = false,
      expandDelay = 0,
      collapseDelay = 0,
      ...props
    },
    ref
  ) => {
    // 从 ExpandableContext 获取展开状态和切换函数
    const { isExpanded, toggleExpand, expandDirection } = useExpandable();

    // 使用 useMeasure 钩子获取内容的尺寸
    const [measureRef, { width, height }] = useMeasure();

    // 创建宽度和高度的运动值
    const animatedWidth = useMotionValue(collapsedSize.width || 0);
    const animatedHeight = useMotionValue(collapsedSize.height || 0);

    // 对运动值应用弹簧动画
    const smoothWidth = useSpring(animatedWidth, springConfig);
    const smoothHeight = useSpring(animatedHeight, springConfig);

    // 在展开状态变化时更新动画尺寸的效果
    useEffect(() => {
      if (isExpanded) {
        animatedWidth.set(expandedSize.width || width);
        animatedHeight.set(expandedSize.height || height);
      } else {
        animatedWidth.set(collapsedSize.width || width);
        animatedHeight.set(collapsedSize.height || height);
      }
    }, [isExpanded, collapsedSize, expandedSize, width, height, animatedWidth, animatedHeight]);

    const handleHover = () => {
      if (hoverToExpand && !isExpanded) {
        setTimeout(toggleExpand, expandDelay);
      }
    };

    const handleHoverEnd = () => {
      if (hoverToExpand && isExpanded) {
        setTimeout(toggleExpand, collapseDelay);
      }
    };

    return (
      <motion.div
        ref={ref}
        className={cn("cursor-pointer", className)}
        style={{
          // 根据展开方向设置宽度和高度
          width: expandDirection === "vertical" ? collapsedSize.width : smoothWidth,
          height: expandDirection === "horizontal" ? collapsedSize.height : smoothHeight
        }}
        transition={springConfig}
        onHoverStart={handleHover}
        onHoverEnd={handleHoverEnd}
        {...props}
      >
        <div ref={measureRef} className="flex flex-col h-full">
          {children}
        </div>
      </motion.div>
    );
  }
);

ExpandableCard.displayName = "ExpandableCard";

const ExpandableTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    const { toggleExpand } = useExpandable();
    return (
      <div ref={ref} onClick={toggleExpand} className="cursor-pointer" {...props}>
        {children}
      </div>
    );
  }
);

ExpandableTrigger.displayName = "ExpandableTrigger";

const ExpandableCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
      <motion.div layout className="flex justify-between items-start">
        {children}
      </motion.div>
    </div>
  )
);

ExpandableCardHeader.displayName = "ExpandableCardHeader";

const ExpandableCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0 px-4 overflow-hidden flex-grow", className)} {...props}>
      <motion.div layout>{children}</motion.div>
    </div>
  )
);
ExpandableCardContent.displayName = "ExpandableCardContent";

const ExpandableCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
);
ExpandableCardFooter.displayName = "ExpandableCardFooter";

export {
  Expandable,
  useExpandable,
  ExpandableCard,
  ExpandableContent,
  ExpandableContext,
  ExpandableTrigger,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableCardFooter
};

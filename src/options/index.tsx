import "@/style.css";
import { createHashHistory, createRouter, Link, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const hashHistory = createHashHistory();

const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultNotFoundComponent: () => {
    return (
      <div>
        <p>Not found!</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }
});

// 为类型安全注册路由器实例
declare module "@tanstack/react-router" {
  interface Register {
    // 这推断出我们路由器的类型，并在整个项目中注册它
    router: typeof router;
  }

  // 强制静态数据
  interface StaticDataRouteOption {}
}

function Options() {
  return (
    // <StrictMode>
    <RouterProvider router={router} />
    // </StrictMode>
  );
}

export default Options;

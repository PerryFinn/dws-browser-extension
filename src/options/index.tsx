import "@/style.css";
import { resetLocalStorage, storage } from "@/storages";
import { Storage } from "@plasmohq/storage";
import { Link, RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import React from "react";
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

const resetStorage = async () => {
  await resetLocalStorage();
  alert("storage 已重置");
};

function Options() {
  return (
    // <StrictMode>
    <RouterProvider router={router} />
    // </StrictMode>
  );
}

export default Options;

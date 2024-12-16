import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/about/")({
  component: RouteComponent,
  staticData: {
    title: "关于"
  }
});

function RouteComponent() {
  return (
    <div>
      <div>关于</div>
      <div>这是一个关于页面</div>
    </div>
  );
}

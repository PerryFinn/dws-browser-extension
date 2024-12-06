import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
  staticData: {
    title: "设置"
  }
});

function RouteComponent() {
  return (
    <div>
      <div>这是设置页面</div>
    </div>
  );
}

import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/")({
  component: RouteComponent,
  staticData: {
    title: "文章"
  }
});

function RouteComponent() {
  return (
    <div>
      <div>这是文章页面</div>
    </div>
  );
}

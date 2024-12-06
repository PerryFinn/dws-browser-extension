import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

function RouteComponent() {
  return <div>Hello "/settings/base/"!</div>;
}

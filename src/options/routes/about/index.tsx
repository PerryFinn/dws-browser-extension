import { createFileRoute } from "@tanstack/react-router";

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
      <div>
        <span>使用指南：</span>
        <a href="https://kb.cvte.com/pages/viewpage.action?pageId=443378357" className="text-blue-600 underline">
          数字孪生交付助手-使用指南
        </a>
      </div>
    </div>
  );
}

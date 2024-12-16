import { createFileRoute, notFound, useParams, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/posts/$postId")({
  component: RouteComponent,
  loader: async (ctx) => {
    const { postId } = ctx.params;
    const resp = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const result: { id: number; title: string; userId: number; completed: boolean } = await resp.json();
    console.log("/posts/$postId loader called :>> ", postId, result);
    return result;
  },
  staleTime: Number.MAX_SAFE_INTEGER,
  notFoundComponent: () => <div>/posts/$postId notFound</div>,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="text-red-500">
        <div>/posts/$postId error:{error.message}</div>
        <div>
          <button type="button" onClick={reset}>
            重试
          </button>
          <button type="button" onClick={() => router.invalidate()}>
            重试 loader 并刷新路由
          </button>
        </div>
      </div>
    );
  }
});

function RouteComponent() {
  const { postId } = Route.useParams();
  const data = Route.useLoaderData();
  useEffect(() => {
    console.log("fetching data...", data);
  }, [data]);

  return (
    <div>
      <div>Hello "/posts/$postId" wow!</div>
      <div>postId: {postId}</div>
    </div>
  );
}

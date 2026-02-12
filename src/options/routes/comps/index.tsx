import { createFileRoute } from "@tanstack/react-router";
import { BackgroundBeamsWithCollision } from "@/components/complex-ui/background-beams-with-collision";
import { FamilyButton } from "@/components/complex-ui/family-button";
// import { TextGenerateEffect } from "@/components/complex-ui/text-generate-effect";
import { Divider } from "@/components/ui/divider";

export const Route = createFileRoute("/comps/")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="w-full h-full relative">
      <BackgroundBeamsWithCollision className="flex-col justify-start items-center">
        {/* <TextGenerateEffect className="text-4xl text-center" words="这里负责测试各种组件，丐版 StoryBook" /> */}
        <Divider />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <FamilyButton>
            <div className=" text-red-500 h-full w-full">点点这里</div>
          </FamilyButton>
        </div>
        <Divider />
      </BackgroundBeamsWithCollision>
    </div>
  );
}

import { BackgroundBeamsWithCollision } from "@/components/complex-ui/background-beams-with-collision";
import { FamilyButton } from "@/components/complex-ui/family-button";
import { TextGenerateEffect } from "@/components/complex-ui/text-generate-effect";
import { Divider } from "@/components/ui/divider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/comps/")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="w-full h-full">
      <BackgroundBeamsWithCollision className="flex-col justify-start items-center">
        <TextGenerateEffect className="text-4xl text-center" words="这里负责测试各种组件，丐版 StoryBook" />
        <Divider />
        <div>
          <FamilyButton>点点这里</FamilyButton>
        </div>
        <Divider />
      </BackgroundBeamsWithCollision>
    </div>
  );
}

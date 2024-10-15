import React, { memo } from "react";

import { TextGenerateEffect } from "@/components/complex-ui/text-generate-effect";
import { Badge } from "@/components/ui/badge";

import packageJson from "../../package.json";

function Header() {
  const words = `${packageJson.displayName}`;
  return (
    <div className="text-xl font-black flex justify-start items-center gap-2">
      <h1>{words}</h1>
      <Badge variant="outline">{packageJson.version}</Badge>
    </div>
  );
}

export default memo(Header);

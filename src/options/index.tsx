import React from "react";

import { Storage } from "@plasmohq/storage";

import { Button } from "@/components/ui/button";

const storage = new Storage();

const resetStorage = async () => {
  // await storage.set("enabled", false);
  storage.clear();
  await Promise.all([
    storage.set("verifiedIpList", []),
    storage.set("processInfo", []),
    storage.set("isRunningTask", false),
    storage.set("taskResult", { success: [], failed: [], error: [] })
  ]);
  alert("storage 已重置");
};

function Options() {
  return (
    <div>
      <Button onClick={resetStorage}>重置 storage</Button>
    </div>
  );
}

export default Options;

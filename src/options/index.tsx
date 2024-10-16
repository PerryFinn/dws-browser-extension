import React from "react";

import { Storage } from "@plasmohq/storage";

import { Button } from "@/components/ui/button";
import { resetLocalStorage, storage } from "@/storages";

const resetStorage = async () => {
  await resetLocalStorage();
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

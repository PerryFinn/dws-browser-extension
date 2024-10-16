import cssText from "data-text:@/style.css";
import type { PlasmoCSConfig } from "plasmo";
import { useEffect } from "react";

import { sendToBackground } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";

import type { PingReqBody, PingResBody } from "@/background/messages/ping";
import { CountButton } from "@/components/count-button";
import type { UserPasswordPair } from "@/utils/hikCrypto";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
};

const storage = new Storage({ area: "local" });

const accounts: Array<UserPasswordPair> = [
  { username: "admin", host: "172.20.124.200", passwords: ["1qaz@WSX"] },
  { username: "user1", host: "172.20.124.200", passwords: ["password1", "pwd4"] },
  {
    username: "admin",
    host: "192.168.42.162",
    passwords: ["password2", "Kindlink"]
  },
  {
    username: "admin",
    host: "192.168.41.131",
    passwords: ["password3", "Kindlink"]
  }
];

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

const PlasmoOverlay = () => {
  const [enabled] = useStorage({ key: "enabled", instance: storage }, false);
  const handleClick = async () => {
    const ips = new Set(accounts.map((account) => account.host));
    for (const ip of ips) {
      const isSuc = await sendToBackground<PingReqBody, PingResBody>({
        name: "ping",
        body: {
          url: ip
        }
      });
      console.log(`【${ip}}】isSuc :>> `, isSuc);
    }
  };
  if (!enabled) return null;
  return (
    <div className="z-50 flex fixed top-32 right-8">
      <CountButton onClick={handleClick} />
    </div>
  );
};

export default PlasmoOverlay;

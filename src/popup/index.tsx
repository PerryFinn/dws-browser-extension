import { sendToBackground } from "@plasmohq/messaging";
import { useCallback, useEffect, useState } from "react";

import "@/style.css";
import "react-toastify/dist/ReactToastify.css";

import type { ActiveTabIdReqBody, ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import { GenericPanel } from "./generic/panel";
import { SwqaPanel } from "./swqa/panel";
import { type ParsedSwqaUrl, parseSwqaInterfaceUrl } from "./swqa/url";

function IndexPopup() {
  const [tab, setTab] = useState<ActiveTabIdResBody | null>(null);
  const [parsedUrl, setParsedUrl] = useState<ParsedSwqaUrl | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [forceGeneric, setForceGeneric] = useState(false);

  const refreshActiveTab = useCallback(async () => {
    try {
      const activeTab = await sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({
        name: "getActiveTab"
      });
      setTab(activeTab);
      const parsed = parseSwqaInterfaceUrl(activeTab?.url);
      setParsedUrl(parsed);
      setPageError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPageError(message);
      setParsedUrl(null);
    }
  }, []);

  useEffect(() => {
    void refreshActiveTab();
  }, [refreshActiveTab]);

  const isSwqaPage = parsedUrl?.ok === true;

  if (isSwqaPage && !forceGeneric) {
    return (
      <SwqaPanel
        tab={tab}
        parsedUrl={parsedUrl}
        pageError={pageError}
        onRefresh={refreshActiveTab}
        onUseGeneric={() => setForceGeneric(true)}
      />
    );
  }

  return (
    <GenericPanel
      tab={tab}
      pageError={pageError}
      isSwqaPage={isSwqaPage}
      onRefresh={refreshActiveTab}
      onUseSwqa={isSwqaPage ? () => setForceGeneric(false) : undefined}
    />
  );
}

export default IndexPopup;

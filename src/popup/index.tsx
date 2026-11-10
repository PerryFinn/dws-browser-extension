import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncTask } from "@/hooks/use-async-task";
import { sendToBackground } from "@/lib/extension-messaging";

import "@/style.css";
import "react-toastify/dist/ReactToastify.css";

import type { ActiveTabIdReqBody, ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import { GenericPanel } from "./generic/panel";
import { SwqaPanel } from "./swqa/panel";
import { parseSwqaInterfaceUrl } from "./swqa/url";

function IndexPopup() {
  const { state: activeTab, run: readActiveTab } = useAsyncTask<ActiveTabIdResBody>({ keepPreviousData: true });
  const tab = activeTab.status === "error" ? null : activeTab.data;
  const parsedUrl = useMemo(() => parseSwqaInterfaceUrl(tab?.url), [tab?.url]);
  const pageError = activeTab.error;
  const [forceGeneric, setForceGeneric] = useState(false);

  const refreshActiveTab = useCallback(async () => {
    await readActiveTab(() =>
      sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({
        name: "getActiveTab"
      })
    );
  }, [readActiveTab]);

  useEffect(() => {
    void refreshActiveTab();
  }, [refreshActiveTab]);

  const isSwqaPage = parsedUrl?.ok === true;

  if (isSwqaPage && !forceGeneric) {
    return (
      <SwqaPanel
        key={`${tab?.id}:${parsedUrl.url}`}
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

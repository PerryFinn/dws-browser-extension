import type { downloadReqBody, downloadResBody } from "@/background/messages/download";
import type { ExportXLSXReqBody, ExportXLSXResBody } from "@/background/messages/exportXLSX";
import type { fetchReqBody, fetchResBody } from "@/background/messages/fetch";
import type {
  GenericExtractApiDocReqBody,
  GenericExtractApiDocResBody
} from "@/background/messages/genericExtractApiDoc";
import type {
  GenericSelfCheckCurrentCaptureReqBody,
  GenericSelfCheckCurrentCaptureResBody
} from "@/background/messages/genericSelfCheckCurrentCapture";
import type {
  GenericTestModelConfigReqBody,
  GenericTestModelConfigResBody
} from "@/background/messages/genericTestModelConfig";
import type { ActiveTabIdReqBody, ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import type { GetWindowConfigReqBody, GetWindowConfigResBody } from "@/background/messages/getWindowConfig";
import type { OpenOrReplaceTabReqBody, OpenOrReplaceTabResBody } from "@/background/messages/openOrReplaceTab";
import type { parsingXLSXReqBody, parsingXLSXResBody } from "@/background/messages/parsingXLSX";
import type { PingReqBody, PingResBody } from "@/background/messages/ping";
import type {
  SwqaGetInterfaceDetailReqBody,
  SwqaGetInterfaceDetailResBody
} from "@/background/messages/swqaGetInterfaceDetail";

// Keep messaging metadata checked in so clean worktrees typecheck before Plasmo regenerates `.plasmo`.
declare module "@plasmohq/messaging" {
  interface MessagesMetadata {
    download: {
      req: downloadReqBody;
      res: downloadResBody;
    };
    exportXLSX: {
      req: ExportXLSXReqBody;
      res: ExportXLSXResBody;
    };
    fetch: {
      req: fetchReqBody;
      res: fetchResBody;
    };
    genericExtractApiDoc: {
      req: GenericExtractApiDocReqBody;
      res: GenericExtractApiDocResBody;
    };
    genericSelfCheckCurrentCapture: {
      req: GenericSelfCheckCurrentCaptureReqBody;
      res: GenericSelfCheckCurrentCaptureResBody;
    };
    genericTestModelConfig: {
      req: GenericTestModelConfigReqBody;
      res: GenericTestModelConfigResBody;
    };
    getActiveTab: {
      req: ActiveTabIdReqBody;
      res: ActiveTabIdResBody;
    };
    getWindowConfig: {
      req: GetWindowConfigReqBody;
      res: GetWindowConfigResBody;
    };
    openOrReplaceTab: {
      req: OpenOrReplaceTabReqBody;
      res: OpenOrReplaceTabResBody;
    };
    parsingXLSX: {
      req: parsingXLSXReqBody;
      res: parsingXLSXResBody;
    };
    ping: {
      req: PingReqBody;
      res: PingResBody;
    };
    swqaGetInterfaceDetail: {
      req: SwqaGetInterfaceDetailReqBody;
      res: SwqaGetInterfaceDetailResBody;
    };
  }
}

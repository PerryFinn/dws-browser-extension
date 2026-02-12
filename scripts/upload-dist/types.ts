export interface CdnUploaderOptions {
  workingDirPath?: string;
  resourcePath?: string;
  cdnSubPath: string;
  cdnIgnorePath?: string;
  removeFiles?: boolean;
  ignoreUploadFail?: boolean;
  archive?: "system-tar" | "node-tar";
}

export interface TaskResponse {
  code: number;
  data: {
    state: "SUBMITTED" | "PROCESSING" | "SUCCESS" | "FAILED";
    message?: string;
  };
}

export interface UploadResponse {
  code: number;
  data: string;
  message?: string;
}

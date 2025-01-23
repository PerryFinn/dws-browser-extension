export interface UploadOptions {
  appId: string;
  isTest?: boolean;
  clientIp?: string;
  clientId?: string;
  keyPrefix?: string;
}

export interface UploadPolicyField {
  key: string;
  value: string;
}

export interface UploadPolicy {
  formFields: UploadPolicyField[];
  uploadUrl: string;
  policyList: Array<{
    formFields: UploadPolicyField[];
    uploadUrl: string;
  }>;
  keyPrefix: string;
}

export interface UploadResponse {
  data: {
    downloadUrl: string;
  };
}

export type UploadProgressCallback = (
  progress: number | string,
  fileName: string,
  /** 其它额外的信息 */
  meta?: { isExist?: boolean }
) => void;

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: Error;
  fileName: string;
  isExist?: boolean;
}

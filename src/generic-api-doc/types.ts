export type GenericProviderType = "openai-compatible" | "openai";

export type GenericCaptureMode = "generic-dom" | "generic-selection";

export type GenericSchemaScalarType = "string" | "number" | "boolean" | "null" | "unknown";

export interface GenericSchemaNodeBase {
  description?: string;
  required?: boolean;
}

export interface GenericObjectSchemaNode extends GenericSchemaNodeBase {
  type: "object";
  properties: Record<string, GenericSchemaNode>;
}

export interface GenericArraySchemaNode extends GenericSchemaNodeBase {
  type: "array";
  items: GenericSchemaNode;
}

export interface GenericScalarSchemaNode extends GenericSchemaNodeBase {
  type: GenericSchemaScalarType;
}

export type GenericSchemaNode = GenericObjectSchemaNode | GenericArraySchemaNode | GenericScalarSchemaNode;

export interface GenericUncertainty {
  field: string;
  reason: string;
}

export interface GenericParameter {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  example?: unknown;
}

export interface GenericExtractionSource {
  url: string;
  title: string;
  mode: GenericCaptureMode;
}

export interface GenericExtractionEndpoint {
  name: string;
  path: string;
  method: string;
  description?: string;
}

export interface GenericExtractionRequest {
  pathParams: GenericParameter[];
  queryParams: GenericParameter[];
  headers: GenericParameter[];
  body: GenericSchemaNode | null;
  auth?: string | null;
}

export interface GenericExtractionResponse {
  successBody: GenericSchemaNode | null;
  errorNotes?: string | null;
}

export interface GenericExtractionResult {
  source: GenericExtractionSource;
  endpoint: GenericExtractionEndpoint;
  request: GenericExtractionRequest;
  response: GenericExtractionResponse;
  uncertainties: GenericUncertainty[];
}

export interface GenericCaptureContext {
  source: GenericExtractionSource;
  rawText: string;
  previewText: string;
  domSummary?: string | null;
}

export type GenericPickerMessage =
  | { type: "generic-picker:start" }
  | { type: "generic-picker:read-selection" }
  | { type: "generic-picker:reset" };

export type GenericPickerResponse =
  | { success: true; data?: GenericCaptureContext }
  | { success: false; message: string };

export interface GenericModelConfig {
  apiType: GenericProviderType;
  baseUrl: string;
  modelId: string;
  apiKey: string;
}

export interface GenericModelTestRequest {
  config: GenericModelConfig;
}

export interface GenericModelTestResult {
  ok: boolean;
  message: string;
}

export interface GenericExtractApiDocRequest {
  capture: GenericCaptureContext;
}

export interface GenericExtractApiDocSuccess {
  ok: true;
  result: GenericExtractionResult;
  rawOutput?: string;
}

export interface GenericExtractApiDocFailure {
  ok: false;
  message: string;
  code: "invalid-config" | "empty-capture" | "network-error" | "provider-error" | "normalize-error" | "unknown-error";
  rawOutput?: string;
}

export type GenericExtractApiDocResult = GenericExtractApiDocSuccess | GenericExtractApiDocFailure;

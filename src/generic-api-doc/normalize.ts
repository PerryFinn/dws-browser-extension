import type {
  GenericCaptureMode,
  GenericExtractionResult,
  GenericParameter,
  GenericSchemaNode,
  GenericSchemaScalarType,
  GenericUncertainty
} from "./types";

const SUPPORTED_HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const SUPPORTED_SCHEMA_SCALAR_TYPES = new Set<GenericSchemaScalarType>([
  "string",
  "number",
  "boolean",
  "null",
  "unknown"
]);
const COMPLEX_SCHEMA_KEYS = ["oneOf", "anyOf", "allOf", "discriminator"] as const;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOwn = <T extends UnknownRecord>(value: T, key: string): boolean => {
  return Object.hasOwn(value, key);
};

const requireRecord = (value: unknown, field: string): UnknownRecord => {
  if (!isRecord(value)) {
    throw new Error(`Field ${field} must be an object`);
  }

  return value;
};

const requireTopLevelRecord = (value: UnknownRecord, field: keyof GenericExtractionResult): UnknownRecord => {
  if (!hasOwn(value, field)) {
    throw new Error(`Missing required field: ${field}`);
  }

  return requireRecord(value[field], field);
};

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Field ${field} must be a non-empty string`);
  }

  return value.trim();
};

const readOptionalString = (value: unknown, field: string): string | undefined => {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Field ${field} must be a string`);
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? undefined : trimmedValue;
};

const readOptionalNullableString = (value: unknown, field: string): string | null | undefined => {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return readOptionalString(value, field);
};

const requireArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Field ${field} must be an array`);
  }

  return value;
};

const normalizeParameterList = (value: unknown, field: string): GenericParameter[] => {
  return requireArray(value, field).map((item, index) => {
    if (!isRecord(item)) {
      return {
        name: `${field}[${index}]`,
        example: item
      };
    }

    return {
      name: typeof item.name === "string" && item.name.trim().length > 0 ? item.name.trim() : `${field}[${index}]`,
      type: typeof item.type === "string" ? item.type.trim() || undefined : undefined,
      required: typeof item.required === "boolean" ? item.required : undefined,
      description: typeof item.description === "string" ? item.description.trim() || undefined : undefined,
      example: item.example
    };
  });
};

const normalizeCaptureMode = (value: unknown): GenericCaptureMode => {
  if (value === "generic-dom" || value === "generic-selection") {
    return value;
  }

  throw new Error(`Unsupported source mode: ${String(value)}`);
};

const findComplexSchemaKey = (value: UnknownRecord): (typeof COMPLEX_SCHEMA_KEYS)[number] | null => {
  for (const key of COMPLEX_SCHEMA_KEYS) {
    if (hasOwn(value, key)) {
      return key;
    }
  }

  return null;
};

const buildUnknownSchemaNode = (value: UnknownRecord): GenericSchemaNode => {
  const description = readOptionalString(value.description, "schema.description");
  const required = typeof value.required === "boolean" ? value.required : undefined;

  return {
    type: "unknown",
    description,
    required
  };
};

const normalizeScalarSchemaNode = (type: GenericSchemaScalarType, value: UnknownRecord): GenericSchemaNode => {
  const description = readOptionalString(value.description, "schema.description");
  const required = typeof value.required === "boolean" ? value.required : undefined;

  return {
    type,
    description,
    required
  };
};

const ensureSchemaNode = (
  value: GenericSchemaNode | null,
  field: string,
  reason: string
): {
  node: GenericSchemaNode;
  uncertainties: GenericUncertainty[];
} => {
  if (value) {
    return { node: value, uncertainties: [] };
  }

  return {
    node: {
      type: "unknown"
    },
    uncertainties: [{ field, reason }]
  };
};

export const normalizeGenericSchemaNode = (
  value: unknown,
  path: string
): { node: GenericSchemaNode | null; uncertainties: GenericUncertainty[] } => {
  if (value === null || typeof value === "undefined") {
    return {
      node: null,
      uncertainties: []
    };
  }

  if (!isRecord(value)) {
    return {
      node: {
        type: "unknown"
      },
      uncertainties: [{ field: path, reason: "节点不是对象，已降级为 unknown" }]
    };
  }

  const complexSchemaKey = findComplexSchemaKey(value);

  if (complexSchemaKey) {
    return {
      node: buildUnknownSchemaNode(value),
      uncertainties: [
        {
          field: path,
          reason: `检测到 ${complexSchemaKey} 结构，v1 仅保留外层节点并将其降级为 unknown`
        }
      ]
    };
  }

  const rawType = typeof value.type === "string" ? value.type.trim() : undefined;

  if (rawType === "object") {
    const propertiesRecord = isRecord(value.properties) ? value.properties : {};
    const properties: Record<string, GenericSchemaNode> = {};
    const uncertainties: GenericUncertainty[] = [];

    if (!isRecord(value.properties)) {
      uncertainties.push({
        field: path,
        reason: "object 节点缺少有效的 properties，已降级为空对象"
      });
    }

    for (const [propertyName, propertyValue] of Object.entries(propertiesRecord)) {
      const normalizedProperty = normalizeGenericSchemaNode(propertyValue, `${path}.${propertyName}`);
      const ensuredProperty = ensureSchemaNode(
        normalizedProperty.node,
        `${path}.${propertyName}`,
        "对象属性为空，已降级为 unknown"
      );

      properties[propertyName] = ensuredProperty.node;
      uncertainties.push(...normalizedProperty.uncertainties, ...ensuredProperty.uncertainties);
    }

    return {
      node: {
        type: "object",
        description: readOptionalString(value.description, `${path}.description`),
        required: typeof value.required === "boolean" ? value.required : undefined,
        properties
      },
      uncertainties
    };
  }

  if (rawType === "array") {
    const normalizedItems = normalizeGenericSchemaNode(value.items, `${path}[]`);
    const ensuredItems = ensureSchemaNode(
      normalizedItems.node,
      `${path}[]`,
      "array 节点缺少有效的 items，已降级为 unknown"
    );

    return {
      node: {
        type: "array",
        description: readOptionalString(value.description, `${path}.description`),
        required: typeof value.required === "boolean" ? value.required : undefined,
        items: ensuredItems.node
      },
      uncertainties: [...normalizedItems.uncertainties, ...ensuredItems.uncertainties]
    };
  }

  if (rawType && SUPPORTED_SCHEMA_SCALAR_TYPES.has(rawType as GenericSchemaScalarType)) {
    return {
      node: normalizeScalarSchemaNode(rawType as GenericSchemaScalarType, value),
      uncertainties: []
    };
  }

  if (!rawType && isRecord(value.properties)) {
    return normalizeGenericSchemaNode(
      {
        ...value,
        type: "object"
      },
      path
    );
  }

  if (!rawType && hasOwn(value, "items")) {
    return normalizeGenericSchemaNode(
      {
        ...value,
        type: "array"
      },
      path
    );
  }

  if (!rawType) {
    return {
      node: buildUnknownSchemaNode(value),
      uncertainties: [{ field: path, reason: "节点缺少 type，已降级为 unknown" }]
    };
  }

  return {
    node: buildUnknownSchemaNode(value),
    uncertainties: [{ field: path, reason: `节点类型 ${rawType} 不在 v1 支持范围内，已降级为 unknown` }]
  };
};

const normalizeUncertaintyList = (value: unknown): GenericUncertainty[] => {
  return requireArray(value, "uncertainties").map((item, index) => {
    const record = requireRecord(item, `uncertainties[${index}]`);

    return {
      field: requireString(record.field, `uncertainties[${index}].field`),
      reason: requireString(record.reason, `uncertainties[${index}].reason`)
    };
  });
};

export const isSupportedHttpMethod = (value: string): boolean => {
  return SUPPORTED_HTTP_METHODS.has(value.trim().toUpperCase());
};

export const normalizeGenericExtractionResult = (value: unknown): GenericExtractionResult => {
  const root = requireRecord(value, "genericExtractionResult");
  const source = requireTopLevelRecord(root, "source");
  const endpoint = requireTopLevelRecord(root, "endpoint");
  const request = requireTopLevelRecord(root, "request");
  const response = requireTopLevelRecord(root, "response");

  if (!hasOwn(root, "uncertainties")) {
    throw new Error("Missing required field: uncertainties");
  }

  const normalizedRequestBody = normalizeGenericSchemaNode(request.body, "request.body");
  const normalizedSuccessBody = normalizeGenericSchemaNode(response.successBody, "response.successBody");

  return {
    source: {
      url: requireString(source.url, "source.url"),
      title: requireString(source.title, "source.title"),
      mode: normalizeCaptureMode(source.mode)
    },
    endpoint: {
      name: requireString(endpoint.name, "endpoint.name"),
      path: requireString(endpoint.path, "endpoint.path"),
      method: requireString(endpoint.method, "endpoint.method").toUpperCase(),
      description: readOptionalString(endpoint.description, "endpoint.description")
    },
    request: {
      pathParams: normalizeParameterList(request.pathParams, "request.pathParams"),
      queryParams: normalizeParameterList(request.queryParams, "request.queryParams"),
      headers: normalizeParameterList(request.headers, "request.headers"),
      body: normalizedRequestBody.node,
      auth: readOptionalNullableString(request.auth, "request.auth") ?? null
    },
    response: {
      successBody: normalizedSuccessBody.node,
      errorNotes: readOptionalNullableString(response.errorNotes, "response.errorNotes") ?? null
    },
    uncertainties: [
      ...normalizeUncertaintyList(root.uncertainties),
      ...normalizedRequestBody.uncertainties,
      ...normalizedSuccessBody.uncertainties
    ]
  };
};

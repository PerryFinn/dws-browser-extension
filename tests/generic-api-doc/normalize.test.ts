import { strict as assert } from "node:assert";
import test from "node:test";

import { normalizeGenericExtractionResult, normalizeGenericSchemaNode } from "@/generic-api-doc/normalize";
import type { GenericExtractionResult } from "@/generic-api-doc/types";

test("顶层缺少关键字段时报错", () => {
  assert.throws(
    () =>
      normalizeGenericExtractionResult({
        endpoint: {
          name: "获取用户详情",
          path: "/api/user/detail",
          method: "GET"
        }
      }),
    /Missing required field: source/
  );
});

test("request.body 支持多层 object 和 array 嵌套", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/user/search",
      title: "搜索用户接口",
      mode: "generic-selection"
    },
    endpoint: {
      name: "搜索用户",
      path: "/api/user/search",
      method: "POST"
    },
    request: {
      pathParams: [],
      queryParams: [],
      headers: [],
      body: {
        type: "object",
        properties: {
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string"
                },
                values: {
                  type: "array",
                  items: {
                    type: "number"
                  }
                }
              }
            }
          }
        }
      },
      auth: null
    },
    response: {
      successBody: null,
      errorNotes: null
    },
    uncertainties: []
  });

  assert.equal(result.request.body?.type, "object");
  if (result.request.body?.type !== "object") {
    assert.fail("request.body 应为 object");
  }

  const filtersNode = result.request.body.properties.filters;
  assert.equal(filtersNode.type, "array");
  if (filtersNode.type !== "array") {
    assert.fail("filters 应为 array");
  }

  assert.equal(filtersNode.items.type, "object");
});

test("response.successBody 保留分页壳结构", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/order/list",
      title: "订单列表",
      mode: "generic-dom"
    },
    endpoint: {
      name: "订单列表",
      path: "/api/order/list",
      method: "GET"
    },
    request: {
      pathParams: [],
      queryParams: [],
      headers: [],
      body: null,
      auth: null
    },
    response: {
      successBody: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              list: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    orderId: {
                      type: "string"
                    }
                  }
                }
              },
              total: {
                type: "number"
              }
            }
          }
        }
      },
      errorNotes: null
    },
    uncertainties: []
  });

  assert.equal(result.response.successBody?.type, "object");
  if (result.response.successBody?.type !== "object") {
    assert.fail("response.successBody 应为 object");
  }

  const dataNode = result.response.successBody.properties.data;
  assert.equal(dataNode.type, "object");
  if (dataNode.type !== "object") {
    assert.fail("data 应为 object");
  }

  assert.equal(dataNode.properties.list.type, "array");
  assert.equal(dataNode.properties.total.type, "number");
});

test("未知深层节点会降级为 unknown", () => {
  const normalized = normalizeGenericSchemaNode(
    {
      type: "object",
      properties: {
        metadata: {
          type: "mystery"
        }
      }
    },
    "request.body"
  );

  assert.equal(normalized.node?.type, "object");
  if (normalized.node?.type !== "object") {
    assert.fail("schema 根节点应为 object");
  }

  assert.equal(normalized.node.properties.metadata.type, "unknown");
  assert.deepEqual(normalized.uncertainties, [
    {
      field: "request.body.metadata",
      reason: "节点类型 mystery 不在 v1 支持范围内，已降级为 unknown",
      kind: "degraded"
    }
  ]);
});

test("高复杂结构会落到 uncertainties 而不是抛弃整个结果", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/tree",
      title: "树形节点接口",
      mode: "generic-dom"
    },
    endpoint: {
      name: "获取树形节点",
      path: "/api/tree",
      method: "GET"
    },
    request: {
      pathParams: [],
      queryParams: [],
      headers: [],
      body: null,
      auth: null
    },
    response: {
      successBody: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              children: {
                oneOf: [
                  {
                    type: "array",
                    items: {
                      type: "object"
                    }
                  }
                ]
              }
            }
          }
        }
      },
      errorNotes: null
    },
    uncertainties: []
  });

  assert.equal(result.response.successBody?.type, "object");
  assert.equal(result.uncertainties.length, 1);
  assert.deepEqual(result.uncertainties[0], {
    field: "response.successBody.data.children",
    reason: "检测到 oneOf 结构，v1 仅保留外层节点并将其降级为 unknown",
    kind: "degraded"
  });
});

test("endpoint.method 必须是支持的 HTTP 方法", () => {
  assert.throws(
    () =>
      normalizeGenericExtractionResult({
        source: {
          url: "https://example.com/api/user/detail",
          title: "用户详情接口",
          mode: "generic-dom"
        },
        endpoint: {
          name: "获取用户详情",
          path: "/api/user/detail",
          method: "FETCH"
        },
        request: {
          pathParams: [],
          queryParams: [],
          headers: [],
          body: null,
          auth: null
        },
        response: {
          successBody: null,
          errorNotes: null
        },
        uncertainties: []
      }),
    /Field endpoint.method must be a supported HTTP method/
  );
});

test("异常 endpoint.path 会保留值并标记 conflict uncertainty", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/user/detail",
      title: "用户详情接口",
      mode: "generic-dom"
    },
    endpoint: {
      name: "获取用户详情",
      path: "用户详情接口",
      method: "GET"
    },
    request: {
      pathParams: [],
      queryParams: [],
      headers: [],
      body: null,
      auth: null
    },
    response: {
      successBody: null,
      errorNotes: null
    },
    uncertainties: []
  });

  assert.equal(result.endpoint.path, "用户详情接口");
  assert.deepEqual(result.uncertainties, [
    {
      field: "endpoint.path",
      reason: "endpoint.path 看起来不像 URL 或接口路径，请确认是否提取错误",
      kind: "conflict"
    }
  ]);
});

test("参数缺少 name 时会回退占位名并标记 missing uncertainty", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/user/detail",
      title: "用户详情接口",
      mode: "generic-dom"
    },
    endpoint: {
      name: "获取用户详情",
      path: "/api/user/detail",
      method: "GET"
    },
    request: {
      pathParams: [],
      queryParams: [{ type: "string", required: true }],
      headers: [],
      body: null,
      auth: null
    },
    response: {
      successBody: null,
      errorNotes: null
    },
    uncertainties: []
  });

  assert.equal(result.request.queryParams[0]?.name, "request.queryParams[0]");
  assert.deepEqual(result.uncertainties, [
    {
      field: "request.queryParams[0].name",
      reason: "参数缺少 name，已回退为索引占位名，请用户确认真实参数名",
      kind: "missing"
    }
  ]);
});

test("原始 uncertainties 会被规范化保留", () => {
  const result = normalizeGenericExtractionResult({
    source: {
      url: "https://example.com/api/user/detail",
      title: "用户详情接口",
      mode: "generic-dom"
    },
    endpoint: {
      name: "获取用户详情",
      path: "/api/user/detail",
      method: "GET"
    },
    request: {
      pathParams: [],
      queryParams: [],
      headers: [],
      body: null,
      auth: null
    },
    response: {
      successBody: null,
      errorNotes: null
    },
    uncertainties: [{ field: "endpoint.method", reason: "标题写 GET，正文写 POST" }]
  } satisfies GenericExtractionResult);

  assert.deepEqual(result.uncertainties, [{ field: "endpoint.method", reason: "标题写 GET，正文写 POST" }]);
});

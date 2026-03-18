import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import type {
  GenericTestModelConfigReqBody,
  GenericTestModelConfigResBody
} from "@/background/messages/genericTestModelConfig";
import { Description, Field, FieldGroup, Fieldset, Label, Legend } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Select } from "@/components/catalyst-ui-kit/select";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Textarea } from "@/components/catalyst-ui-kit/textarea";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { storage } from "@/storages";
import {
  GENERIC_API_KEY_STORAGE_KEY,
  GENERIC_BASE_URL_STORAGE_KEY,
  GENERIC_MODEL_ID_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  GENERIC_PROVIDER_TYPE_STORAGE_KEY,
  genericApiDocStorageDefaultValues,
  genericProviderLabelMap,
  isGenericModelConfigComplete
} from "@/storages/generic-api-doc";
import { Button } from "../../components/catalyst-ui-kit/button";

export function GenericApiDocSettings() {
  const [isTesting, setIsTesting] = useState(false);
  const [providerType, setProviderType] = useStorage<GenericModelConfig["apiType"]>(
    { key: GENERIC_PROVIDER_TYPE_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_PROVIDER_TYPE_STORAGE_KEY]
  );
  const [baseUrl, setBaseUrl] = useStorage<string>(
    { key: GENERIC_BASE_URL_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_BASE_URL_STORAGE_KEY]
  );
  const [modelId, setModelId] = useStorage<string>(
    { key: GENERIC_MODEL_ID_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_MODEL_ID_STORAGE_KEY]
  );
  const [apiKey, setApiKey] = useStorage<string>(
    { key: GENERIC_API_KEY_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_API_KEY_STORAGE_KEY]
  );
  const [promptTemplate, setPromptTemplate] = useStorage<string>(
    { key: GENERIC_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]
  );

  const modelConfig = useMemo<GenericModelConfig>(
    () => ({
      apiType: providerType,
      baseUrl,
      modelId,
      apiKey
    }),
    [apiKey, baseUrl, modelId, providerType]
  );

  const canTestConnection = isGenericModelConfigComplete(modelConfig) && !isTesting;

  const handleTestConnection = async () => {
    if (!isGenericModelConfigComplete(modelConfig)) {
      toast.error("请先填写完整的 Generic 模型配置");
      return;
    }

    setIsTesting(true);

    try {
      const response = await sendToBackground<GenericTestModelConfigReqBody, GenericTestModelConfigResBody>({
        name: "genericTestModelConfig" as never,
        body: { config: modelConfig }
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success("Generic 模型连接测试成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Fieldset className="max-w-3xl">
      <Legend>通用 API 文档提取</Legend>
      <FieldGroup>
        <Field>
          <Label htmlFor="generic-provider-type">API 类型</Label>
          <Description>先支持 OpenAI 兼容端点和 OpenAI 官方端点。</Description>
          <Select
            id="generic-provider-type"
            name="generic-provider-type"
            value={providerType}
            onChange={(event) => void setProviderType(event.target.value as GenericModelConfig["apiType"])}
          >
            {Object.entries(genericProviderLabelMap).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="generic-base-url">Base URL</Label>
          <Description>填写模型接口的基础地址，例如 OpenAI 兼容网关或官方 API 地址。</Description>
          <Input
            id="generic-base-url"
            name="generic-base-url"
            type="url"
            placeholder="https://api.openai.com/v1"
            value={baseUrl ?? ""}
            onChange={(event) => void setBaseUrl(event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="generic-model-id">Model ID</Label>
          <Description>例如 `gpt-5.1`、`deepseek-chat` 等。</Description>
          <Input
            id="generic-model-id"
            name="generic-model-id"
            value={modelId ?? ""}
            onChange={(event) => void setModelId(event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="generic-api-key">API Key</Label>
          <Description>仅保存在本地扩展 storage，不会同步到其它设备。</Description>
          <Input
            id="generic-api-key"
            name="generic-api-key"
            type="password"
            autoComplete="off"
            value={apiKey ?? ""}
            onChange={(event) => void setApiKey(event.target.value)}
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>测试连接</Label>
              <Description>只验证是否可发起请求以及是否能返回结构化对象，不验证抽取质量。</Description>
            </div>
            <Button onClick={() => void handleTestConnection()} disabled={!canTestConnection}>
              {isTesting ? "测试中..." : "测试连接"}
            </Button>
          </div>
        </Field>

        <Field>
          <Label htmlFor="generic-prompt-template">Prompt 模板</Label>
          <Description>
            支持的占位符：<Code>{"{{json}}"}</Code> / <Code>{"{{url}}"}</Code>
          </Description>
          <Textarea
            id="generic-prompt-template"
            data-slot="control"
            rows={12}
            value={promptTemplate ?? ""}
            onChange={(event) => void setPromptTemplate(event.target.value)}
            className="relative block w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-[hover]:border-white/20"
          />
        </Field>
      </FieldGroup>
    </Fieldset>
  );
}

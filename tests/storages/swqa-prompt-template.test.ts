import { expect, test } from "vitest";
import { SWQA_PROMPT_TEMPLATES_STORAGE_KEY, swqaPromptTemplatesDefaultValue } from "@/storages/swqa-prompt-template";

test("SWQA prompt 对象默认值稳定", () => {
  expect(SWQA_PROMPT_TEMPLATES_STORAGE_KEY).toBe("swqaPromptTemplates");
  expect(typeof swqaPromptTemplatesDefaultValue.create).toBe("string");
  expect(typeof swqaPromptTemplatesDefaultValue.update).toBe("string");
});

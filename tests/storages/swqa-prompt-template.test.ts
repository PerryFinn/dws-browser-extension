import { strict as assert } from "node:assert";
import test from "node:test";

import { SWQA_PROMPT_TEMPLATES_STORAGE_KEY, swqaPromptTemplatesDefaultValue } from "@/storages/swqa-prompt-template";

test("SWQA prompt 对象默认值稳定", () => {
  assert.equal(SWQA_PROMPT_TEMPLATES_STORAGE_KEY, "swqaPromptTemplates");
  assert.equal(typeof swqaPromptTemplatesDefaultValue.create, "string");
  assert.equal(typeof swqaPromptTemplatesDefaultValue.update, "string");
});

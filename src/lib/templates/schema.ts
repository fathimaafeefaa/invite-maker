import { z } from "zod";
import type { FieldDef, TemplateDef } from "./types";

const DEFAULT_MAX = 200;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
// Storage object paths only (never full URLs), so user data can't point
// guests at arbitrary hosts.
const STORAGE_PATH = /^[\w-]+\/[\w-]+\/[\w.-]+$/;

function fieldSchema(field: FieldDef, draft: boolean): z.ZodType {
  const required = field.required && !draft;
  const max = field.max ?? (field.type === "textarea" ? 1000 : DEFAULT_MAX);

  switch (field.type) {
    case "text":
    case "textarea": {
      const base = z.string().trim().max(max);
      return required ? base.min(1) : base.optional();
    }
    case "datetime": {
      const base = z.string().regex(LOCAL_DATETIME);
      return required ? base : base.optional();
    }
    case "url": {
      // https only: blocks javascript:, data: and plain-http links.
      const base = z
        .string()
        .max(max)
        .refine((v) => {
          try {
            return new URL(v).protocol === "https:";
          } catch {
            return false;
          }
        }, "Must be a valid https:// link");
      return required ? base : base.or(z.literal("")).optional();
    }
    case "image": {
      const base = z.string().regex(STORAGE_PATH).max(300);
      return required ? base : base.optional();
    }
    case "images":
      return z.array(z.string().regex(STORAGE_PATH).max(300)).max(field.max ?? 12).optional();
  }
}

/**
 * Builds a Zod object schema from a template's field list. Unknown keys are
 * rejected. With `draft: true`, required fields may be missing (work in
 * progress); publishing uses the strict default.
 */
export function buildDataSchema(template: TemplateDef, options: { draft?: boolean } = {}) {
  const draft = options.draft ?? false;
  const shape: Record<string, z.ZodType> = {};
  for (const field of template.fields) shape[field.key] = fieldSchema(field, draft);
  return z.object(shape).strict();
}

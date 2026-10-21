import { z } from "zod";
import type { FieldDef, TemplateDef } from "./types";

const DEFAULT_MAX = 200;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
// Storage object paths only (never full URLs), so user data can't point
// guests at arbitrary hosts.
const STORAGE_PATH = /^[\w-]+\/[\w-]+\/[\w.-]+$/;

function fieldSchema(field: FieldDef): z.ZodType {
  const max = field.max ?? (field.type === "textarea" ? 1000 : DEFAULT_MAX);

  switch (field.type) {
    case "text":
    case "textarea": {
      const base = z.string().trim().max(max);
      return field.required ? base.min(1) : base.optional();
    }
    case "datetime": {
      const base = z.string().regex(LOCAL_DATETIME);
      return field.required ? base : base.optional();
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
      return field.required ? base : base.or(z.literal("")).optional();
    }
    case "image": {
      const base = z.string().regex(STORAGE_PATH).max(300);
      return field.required ? base : base.optional();
    }
    case "images":
      return z.array(z.string().regex(STORAGE_PATH).max(300)).max(field.max ?? 12).optional();
  }
}

/** Builds a Zod object schema from a template's field list. Unknown keys are rejected. */
export function buildDataSchema(template: TemplateDef) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of template.fields) shape[field.key] = fieldSchema(field);
  return z.object(shape).strict();
}

export type FieldType =
  | "text"
  | "textarea"
  | "datetime"
  | "image"
  | "images"
  | "url";

export interface FieldDef {
  key: string;
  type: FieldType;
  label: string;
  group: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** Max characters for text/textarea/url; max items for images. */
  max?: number;
}

export interface TemplateDef {
  id: string;
  occasion: Occasion;
  name: string;
  description: string;
  fields: FieldDef[];
  /** Keys of the fields that name the event (e.g. both partners), in order. Used for titles, link previews and slugs. */
  titleFields: string[];
  /** Sample values used for template previews and dev fixtures. */
  sample: Record<string, string | string[]>;
}

export const OCCASIONS = [
  "wedding",
  "birthday",
  "housewarming",
  "baby-shower",
  "anniversary",
  "corporate",
  "other",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export type InvitationData = Record<string, string | string[] | undefined>;

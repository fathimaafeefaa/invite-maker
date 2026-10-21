import { wedding } from "./definitions/wedding";
import type { Occasion, TemplateDef } from "./types";

const TEMPLATES: TemplateDef[] = [wedding];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDef | undefined {
  return BY_ID.get(id);
}

export function listTemplates(occasion?: Occasion): TemplateDef[] {
  return occasion ? TEMPLATES.filter((t) => t.occasion === occasion) : TEMPLATES;
}

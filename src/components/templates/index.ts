import type { ComponentType } from "react";
import { WeddingClassic, type TemplateProps } from "./WeddingClassic";

/** Maps a template id (see lib/templates/registry) to its React component. */
export const TEMPLATE_COMPONENTS: Record<string, ComponentType<TemplateProps>> = {
  "wedding-classic": WeddingClassic,
};

export type { TemplateProps };

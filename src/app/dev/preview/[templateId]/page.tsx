import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TEMPLATE_COMPONENTS } from "@/components/templates";
import { localToInstant } from "@/lib/datetime";
import { getTemplate } from "@/lib/templates/registry";

// Dev-only: renders a template from its sample data, no database needed.
// With Cache Components, `params` must be awaited inside <Suspense>.
export default function PreviewPage({ params }: PageProps<"/dev/preview/[templateId]">) {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Suspense fallback={null}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/dev/preview/[templateId]">, "params">) {
  const { templateId } = await params;
  const template = getTemplate(templateId);
  const Component = TEMPLATE_COMPONENTS[templateId];
  if (!template || !Component) notFound();

  const eventAt = template.sample.eventAt as string;
  return (
    <Component
      data={template.sample}
      locale="en"
      eventIso={localToInstant(eventAt, "Asia/Kolkata").toISOString()}
    />
  );
}

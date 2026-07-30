import type { JsonLdObject } from "@/lib/structured-data";

interface JsonLdProps {
  data: JsonLdObject | JsonLdObject[];
}

/**
 * Emits a <script type="application/ld+json"> block. Server-rendered, so the
 * markup is in the initial HTML and costs no client JS.
 *
 * `<` is escaped because product names and descriptions come from KeyCRM: a
 * value containing "</script>" would otherwise close the tag early and inject
 * whatever followed it into the page.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

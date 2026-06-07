import {
  assertValidStructuredData,
  type StructuredData,
} from "@/lib/structured-data";

type JsonLdProps = {
  data: StructuredData;
};

export function JsonLd({ data }: JsonLdProps) {
  assertValidStructuredData(data);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

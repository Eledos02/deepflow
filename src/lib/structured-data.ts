import type { FaqItem } from "@/content/types";

import { absoluteUrl, siteConfig } from "./site";

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdObject
  | JsonLdValue[];

export type JsonLdObject = {
  [key: string]: JsonLdValue;
};

export type StructuredData = JsonLdObject | JsonLdObject[];

export const structuredDataIds = {
  organization: absoluteUrl("/#organization"),
  website: absoluteUrl("/#website"),
  softwareApplication: absoluteUrl("/#software-application"),
} as const;

const publisherReference: JsonLdObject = {
  "@id": structuredDataIds.organization,
};

const websiteReference: JsonLdObject = {
  "@id": structuredDataIds.website,
};

export function createGlobalStructuredData(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": structuredDataIds.organization,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/deepflow-icon-512.png"),
        },
      },
      {
        "@type": "WebSite",
        "@id": structuredDataIds.website,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en-US",
        publisher: publisherReference,
      },
      {
        "@type": "SoftwareApplication",
        "@id": structuredDataIds.softwareApplication,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        image: absoluteUrl(siteConfig.socialImage),
        publisher: publisherReference,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          url: siteConfig.url,
        },
      },
    ],
  };
}

type SoftwareApplicationSchemaInput = {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
};

export function createSoftwareApplicationSchema({
  name,
  description,
  url,
  keywords,
}: SoftwareApplicationSchemaInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software-application`,
    name,
    description,
    url,
    ...(keywords ? { keywords: keywords.join(", ") } : {}),
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    isPartOf: websiteReference,
    publisher: publisherReference,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      url,
    },
  };
}

export function createFaqSchema(
  items: FaqItem[],
  pageUrl: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    isPartOf: websiteReference,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

type HowToSchemaInput = {
  name: string;
  description: string;
  totalTime: string;
  pageUrl: string;
  steps: Array<{ title: string; description: string }>;
};

export function createHowToSchema({
  name,
  description,
  totalTime,
  pageUrl,
  steps,
}: HowToSchemaInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#how-to`,
    name,
    description,
    totalTime,
    url: `${pageUrl}#timer-how-to-title`,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
      url: `${pageUrl}#timer-how-to-title`,
    })),
  };
}

type BreadcrumbSchemaInput = {
  pageName: string;
  pageUrl: string;
};

export function createBreadcrumbSchema({
  pageName,
  pageUrl,
}: BreadcrumbSchemaInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: siteConfig.name,
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: pageUrl,
      },
    ],
  };
}

type ArticleSchemaInput = {
  headline: string;
  description: string;
  url: string;
};

export function createArticleSchema({
  headline,
  description,
  url,
}: ArticleSchemaInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline,
    description,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    isPartOf: websiteReference,
    author: publisherReference,
    publisher: publisherReference,
    image: absoluteUrl(siteConfig.socialImage),
    inLanguage: "en-US",
  };
}

function validateNode(
  value: JsonLdValue,
  path: string,
  errors: string[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNode(item, `${path}[${index}]`, errors),
    );
    return;
  }

  if (value === null || typeof value !== "object") return;

  if (
    "@context" in value &&
    value["@context"] !== "https://schema.org"
  ) {
    errors.push(`${path}.@context must be https://schema.org`);
  }

  if ("@type" in value && typeof value["@type"] !== "string") {
    errors.push(`${path}.@type must be a string`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      child.startsWith("http") &&
      child.includes("deepflow") &&
      !child.startsWith(siteConfig.url)
    ) {
      errors.push(`${path}.${key} must use ${siteConfig.url}`);
    }

    validateNode(child, `${path}.${key}`, errors);
  }
}

export function validateStructuredData(data: StructuredData) {
  const errors: string[] = [];
  const documents = Array.isArray(data) ? data : [data];

  if (documents.length === 0) {
    errors.push("structured data must contain at least one document");
  }

  documents.forEach((document, index) => {
    if (document["@context"] !== "https://schema.org") {
      errors.push(`$[${index}].@context must be https://schema.org`);
    }

    if (!document["@type"] && !document["@graph"]) {
      errors.push(`$[${index}] must define @type or @graph`);
    }

    validateNode(document, `$[${index}]`, errors);
  });

  try {
    JSON.stringify(data);
  } catch {
    errors.push("structured data must be JSON serializable");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidStructuredData(data: StructuredData) {
  const result = validateStructuredData(data);

  if (!result.valid) {
    throw new Error(`Invalid JSON-LD: ${result.errors.join("; ")}`);
  }
}

import type { Metadata } from "next";

import { absoluteUrl, siteConfig } from "./site";

export type MetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export type MetadataValidationResult = {
  valid: boolean;
  errors: string[];
};

export const metadataLimits = {
  title: { min: 2, max: 70 },
  description: { min: 50, max: 160 },
  keywords: { max: 12 },
} as const;

export function validateMetadataInput({
  title,
  description,
  path,
  keywords,
}: MetadataInput): MetadataValidationResult {
  const errors: string[] = [];
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (
    trimmedTitle.length < metadataLimits.title.min ||
    trimmedTitle.length > metadataLimits.title.max
  ) {
    errors.push(
      `title must contain ${metadataLimits.title.min}-${metadataLimits.title.max} characters`,
    );
  }

  if (
    trimmedDescription.length < metadataLimits.description.min ||
    trimmedDescription.length > metadataLimits.description.max
  ) {
    errors.push(
      `description must contain ${metadataLimits.description.min}-${metadataLimits.description.max} characters`,
    );
  }

  if (!path.startsWith("/") || path.includes("?") || path.includes("#")) {
    errors.push(
      "canonical path must start with / and cannot contain a query string or hash",
    );
  }

  if (keywords) {
    const normalizedKeywords = keywords.map((keyword) =>
      keyword.trim().toLowerCase(),
    );

    if (keywords.length > metadataLimits.keywords.max) {
      errors.push(
        `keywords cannot contain more than ${metadataLimits.keywords.max} entries`,
      );
    }

    if (normalizedKeywords.some((keyword) => keyword.length === 0)) {
      errors.push("keywords cannot contain empty values");
    }

    if (new Set(normalizedKeywords).size !== normalizedKeywords.length) {
      errors.push("keywords must be unique");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createMetadata({
  title,
  description,
  path,
  keywords,
}: MetadataInput): Metadata {
  const validation = validateMetadataInput({
    title,
    description,
    path,
    keywords,
  });

  if (!validation.valid) {
    throw new Error(
      `Invalid metadata for "${path}": ${validation.errors.join("; ")}`,
    );
  }

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const canonical = absoluteUrl(path);
  const socialImage = absoluteUrl("/deepflow-og.png");

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    keywords: keywords?.map((keyword) => keyword.trim()),
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: "en_US",
      title: normalizedTitle,
      description: normalizedDescription,
      url: canonical,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `${normalizedTitle} | ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: normalizedTitle,
      description: normalizedDescription,
      images: [socialImage],
    },
  };
}

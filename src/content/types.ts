export type ContentSection = {
  title: string;
  body: string[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type SeoInternalLink = {
  href: string;
  label: string;
  description: string;
};

export type SeoPage = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  keywords: string[];
  sections: ContentSection[];
  faqs: FaqItem[];
  relatedLinks?: SeoInternalLink[];
};

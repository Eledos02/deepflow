import { siteConfig } from "../lib/site";

// TODO: Switch legalContactEmail to support@deepflownow.com when that inbox is confirmed active.
export const legalContactEmail = siteConfig.email;

export const legalLastUpdated = "July 4, 2026";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalPageContent = {
  slug: "terms" | "privacy";
  title: string;
  description: string;
  intro: string;
  sections: LegalSection[];
  relatedLink: {
    href: string;
    label: string;
    description: string;
  };
};

export const termsPage: LegalPageContent = {
  slug: "terms",
  title: "Terms of Service",
  description:
    "Read the basic rules for using DeepFlow, including accounts, billing readiness, cancellations, refunds, acceptable use, and local-first data behavior.",
  intro:
    "These Terms of Service explain the basic rules for using DeepFlow. By using DeepFlow, you agree to these terms.",
  relatedLink: {
    href: "/privacy",
    label: "Privacy Policy",
    description:
      "Learn how DeepFlow handles account data, local browser storage, cloud backup, payments, email, and analytics.",
  },
  sections: [
    {
      title: "Overview",
      paragraphs: [
        "DeepFlow is a productivity and focus web application. It helps users plan focus sessions, manage routines and goals, track focus history, and build steadier attention habits.",
        "The service is designed to stay practical and calm. Some features work locally in the browser, while account features may use cloud storage when a user signs in and chooses to save selected data.",
      ],
    },
    {
      title: "Accounts",
      paragraphs: [
        "You are responsible for keeping your login credentials secure and for activity that happens through your account.",
        "Please provide accurate account information and keep it current where the product asks for it. You can stop using DeepFlow at any time.",
      ],
    },
    {
      title: "Subscriptions and billing",
      paragraphs: [
        "DeepFlow may offer free and paid plans. When paid plans are available, billing will be handled through Stripe.",
        "Prices, billing intervals, and available plans will be shown before checkout. Subscriptions renew automatically unless canceled according to the cancellation policy shown at checkout or in your billing settings.",
      ],
    },
    {
      title: "Cancellation policy",
      paragraphs: [
        "When billing is enabled, you may cancel your subscription through your account or billing portal. Cancellation stops future renewals.",
        "Unless otherwise stated, access to paid features may continue until the end of the paid billing period.",
      ],
    },
    {
      title: "Refund policy",
      paragraphs: [
        "Payments are generally non-refundable unless required by law or explicitly approved by DeepFlow.",
        `If there is a billing issue, contact ${legalContactEmail} so DeepFlow can review the situation.`,
      ],
    },
    {
      title: "Digital delivery",
      paragraphs: [
        "DeepFlow is delivered online through the website. No physical product is shipped.",
        "Access is provided through the user's account after signup or, when billing is active, after a successful subscription checkout.",
      ],
    },
    {
      title: "Acceptable use",
      items: [
        "Do not abuse, disrupt, attack, scrape, reverse engineer, or misuse DeepFlow.",
        "Do not try to bypass security, rate limits, authentication, billing, or access controls.",
        "Do not use DeepFlow for illegal, harmful, or abusive activity.",
        "Do not interfere with other users' ability to use the service.",
      ],
    },
    {
      title: "User data and local-first behavior",
      paragraphs: [
        "Some DeepFlow data may be stored locally in your browser or device. Local data may not be available on another device unless you use account cloud backup and restore features.",
        "Account features may back up selected sessions, routines, and goals to cloud storage if enabled. Notes Canvas and some preferences may remain local-only if that is the current app behavior.",
      ],
    },
    {
      title: "Service availability",
      paragraphs: [
        "DeepFlow may change, improve, pause, or discontinue features over time.",
        "The service is provided without a guarantee of uninterrupted availability. DeepFlow may occasionally be unavailable because of maintenance, provider outages, or technical issues.",
      ],
    },
    {
      title: "No professional advice",
      paragraphs: [
        "DeepFlow is a productivity tool. It does not provide medical, legal, financial, mental health, or other professional advice.",
        "You are responsible for deciding whether DeepFlow is appropriate for your needs.",
      ],
    },
    {
      title: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, DeepFlow and its operators will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, goodwill, or business opportunities.",
        "DeepFlow's total liability for any claim relating to the service will be limited to the amount you paid to DeepFlow for the service during the twelve months before the claim, or one hundred U.S. dollars if you did not pay for the service.",
      ],
    },
    {
      title: "Changes to these terms",
      paragraphs: [
        "DeepFlow may update these terms from time to time. Updated terms will be posted on this page with a new Last updated date.",
        "Continuing to use DeepFlow after updated terms are posted means you accept the updated terms.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        `Questions about these terms can be sent to ${legalContactEmail}.`,
      ],
    },
  ],
};

export const privacyPage: LegalPageContent = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "Learn how DeepFlow collects, uses, and protects information across accounts, local-first browser data, cloud backup, payments, email, analytics, and storage.",
  intro:
    "This Privacy Policy explains how DeepFlow collects, uses, and protects information when you use the service.",
  relatedLink: {
    href: "/terms",
    label: "Terms of Service",
    description:
      "Review the basic rules for accounts, subscriptions, acceptable use, digital delivery, and service availability.",
  },
  sections: [
    {
      title: "Information we collect",
      items: [
        "Account information, such as your email address and display name if applicable.",
        "Product usage data, such as focus sessions, routines, goals, saved focus history, and related app activity when you use those features.",
        "Billing data handled by Stripe when paid subscriptions are enabled. DeepFlow does not store full card numbers.",
        "Device and browser data, including localStorage, cookies or similar technologies, and analytics events if analytics is configured.",
        "Support or contact information you provide when you email DeepFlow or submit a form.",
      ],
    },
    {
      title: "Local-first data",
      paragraphs: [
        "DeepFlow stores some data locally in your browser or device. This can include timer history, workspace state, preferences, and local-only product data.",
        "Local data may not be available on other devices unless cloud backup and restore are used. Clearing browser storage may remove local-only DeepFlow data.",
      ],
    },
    {
      title: "Cloud backup and account data",
      paragraphs: [
        "Authenticated users may choose to save selected sessions, goals, and routines to their account for backup and restore.",
        "DeepFlow does not claim that Notes Canvas is synced. If Notes Canvas remains local-only in the product, it should be treated as local browser data.",
      ],
    },
    {
      title: "How we use information",
      items: [
        "Provide, operate, and improve DeepFlow.",
        "Authenticate users and protect accounts.",
        "Save and restore account data when users choose account cloud backup.",
        "Process subscriptions through Stripe when billing is enabled.",
        "Send transactional, waitlist, or product-related emails.",
        "Understand usage, diagnose issues, and improve performance.",
      ],
    },
    {
      title: "Payment processing",
      paragraphs: [
        "Stripe processes payment information when paid subscriptions are enabled. DeepFlow should not receive or store full card numbers.",
        "Billing details, invoices, subscriptions, and payment methods may be managed through Stripe and the Stripe customer portal when those billing features are active.",
      ],
    },
    {
      title: "Third-party services",
      paragraphs: [
        "DeepFlow uses service providers to operate the product. These may include Supabase for authentication and database services, Stripe for payments and billing, Resend for emails, hosting providers such as Vercel if used to host the app, and Google Analytics when analytics is configured.",
        "These providers process information according to their own terms and privacy policies.",
      ],
    },
    {
      title: "Cookies and local storage",
      paragraphs: [
        "DeepFlow may use cookies, localStorage, and similar browser technologies for login sessions, preferences, local app data, account features, and analytics.",
        "You can control cookies and site storage through your browser settings, but clearing storage may remove local-only DeepFlow data or sign you out.",
      ],
    },
    {
      title: "Data retention",
      paragraphs: [
        "Account data is kept while your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and maintain security.",
        `You may contact ${legalContactEmail} to ask about account or data deletion. Local browser data can also be cleared through your browser settings, but doing so may remove local-only DeepFlow data.`,
      ],
    },
    {
      title: "User choices",
      items: [
        "You can use many DeepFlow features without creating an account.",
        "You can choose whether to use account cloud backup for supported data.",
        "When billing is active, you can manage or cancel billing through the available account or billing portal.",
        "You can clear local browser data through your browser settings.",
        `You can contact ${legalContactEmail} with privacy questions.`,
      ],
    },
    {
      title: "Children's privacy",
      paragraphs: [
        "DeepFlow is not intended for children under 13. DeepFlow does not knowingly collect personal information from children under 13.",
        "If you believe a child has provided personal information to DeepFlow, contact DeepFlow so the issue can be reviewed.",
      ],
    },
    {
      title: "Security",
      paragraphs: [
        "DeepFlow uses reasonable safeguards to protect information. No system is 100% secure, and DeepFlow cannot guarantee absolute security.",
        "You can help protect your account by using a strong password, keeping your login credentials private, and signing out on shared devices.",
      ],
    },
    {
      title: "International users",
      paragraphs: [
        "If you use DeepFlow from outside the United States, your information may be processed in the United States or other locations where DeepFlow's service providers operate.",
      ],
    },
    {
      title: "Changes to this policy",
      paragraphs: [
        "DeepFlow may update this Privacy Policy from time to time. Updated policies will be posted on this page with a new Last updated date.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        `Questions about this Privacy Policy can be sent to ${legalContactEmail}.`,
      ],
    },
  ],
};

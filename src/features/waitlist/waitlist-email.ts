import { Resend } from "resend";

export const WAITLIST_CONFIRMATION_SUBJECT =
  "Your DeepFlow waitlist confirmation";

type WaitlistEmailEnvironment = {
  RESEND_API_KEY?: string;
  WAITLIST_FROM_EMAIL?: string;
  WAITLIST_REPLY_TO?: string;
};

export type WaitlistEmailConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
};

type ResendClient = {
  emails: {
    send: (message: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html: string;
      replyTo?: string;
    }) => Promise<{ error?: { message?: string; name?: string } | null }>;
  };
};

export type WaitlistEmailSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error"; detail: string };

export function getWaitlistEmailConfig(
  environment: WaitlistEmailEnvironment = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    WAITLIST_FROM_EMAIL: process.env.WAITLIST_FROM_EMAIL,
    WAITLIST_REPLY_TO: process.env.WAITLIST_REPLY_TO,
  },
): WaitlistEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.WAITLIST_FROM_EMAIL?.trim();
  const replyTo = environment.WAITLIST_REPLY_TO?.trim();

  return apiKey && from ? { apiKey, from, replyTo } : null;
}

export function buildWaitlistConfirmationEmail() {
  return {
    text: `Hi,

You're confirmed on the DeepFlow waitlist.

No payment was made today. We'll send you an update before early access opens.

DeepFlow is being built as a calm workspace for focused work - with timers, routines, a focus journal, insights, ambient audio, and a workspace for notes and mind maps.

Thanks for helping shape the early version of DeepFlow.

— DeepFlow

You are receiving this because you joined the DeepFlow waitlist at deepflownow.com.`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f1e7;color:#243127;font-family:Arial,Helvetica,sans-serif;">
    <main style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <section style="background:rgba(255,255,255,0.72);border:1px solid rgba(36,49,39,0.07);border-radius:18px;padding:32px 28px;">
        <p style="margin:0 0 24px;color:#1f4738;font-size:16px;font-weight:700;letter-spacing:0.02em;">DeepFlow</p>
        <h1 style="margin:0 0 16px;color:#163d30;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;">You're confirmed on the waitlist.</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">No payment was made today. We'll send you an update before early access opens.</p>
        <p style="margin:0;font-size:16px;line-height:1.65;">DeepFlow is being built as a calm workspace for focused work - with timers, routines, a focus journal, insights, ambient audio, and a workspace for notes and mind maps.</p>
        <p style="margin:26px 0 0;font-size:16px;line-height:1.65;">Thanks for helping shape the early version of DeepFlow.<br><br>— DeepFlow</p>
      </section>
      <p style="margin:18px 8px 0;color:#6b746b;font-size:12px;line-height:1.55;">You are receiving this because you joined the DeepFlow waitlist at deepflownow.com.</p>
    </main>
  </body>
</html>`,
  };
}

function safeProviderError(error: { message?: string; name?: string } | null | undefined) {
  const message = error?.message?.trim() || error?.name?.trim() || "Email provider rejected the request.";
  return message.slice(0, 240);
}

export async function sendWaitlistConfirmationEmail(
  recipient: string,
  config = getWaitlistEmailConfig(),
  client?: ResendClient,
): Promise<WaitlistEmailSendResult> {
  if (!config) {
    return {
      sent: false,
      reason: "not_configured",
      detail: "Resend or the waitlist sender is not configured.",
    };
  }

  const content = buildWaitlistConfirmationEmail();
  const resend = client ?? new Resend(config.apiKey);
  const result = await resend.emails.send({
    from: config.from,
    to: [recipient],
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    text: content.text,
    html: content.html,
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
  });

  if (result.error) {
    return {
      sent: false,
      reason: "provider_error",
      detail: safeProviderError(result.error),
    };
  }

  return { sent: true };
}

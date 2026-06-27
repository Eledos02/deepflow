# Auth Email Branding

DeepFlow uses Supabase Auth for account emails. For this sprint, keep auth
email delivery inside Supabase hosted Auth emails unless the project already has
a reviewed custom sending path for the exact email type.

## Templates To Review

- Confirm signup
- Reset password
- Magic link, if magic links are enabled

## Sender Branding

Use one calm, recognizable sender name across Auth emails:

- DeepFlow
- DeepFlow Account
- DeepFlow Founders, only if that name is already used consistently for founder
  communications

Avoid mixing product, founder, and support sender names in the same account
flow.

## Subject Lines

- Confirm signup: "Confirm your DeepFlow account"
- Reset password: "Reset your DeepFlow password"

## Copy Direction

Keep copy calm, concise, and trust-focused. Auth emails should help the person
complete the account action quickly, not sell features.

Recommended reset-password shape:

- State that a password reset was requested for a DeepFlow account.
- Include the Supabase reset action link/button.
- Tell the recipient they can ignore the email if they did not request it.
- Avoid saying whether an email address exists in DeepFlow.

Recommended confirm-signup shape:

- Welcome the person to DeepFlow.
- Ask them to confirm their email address.
- Keep any product language short and practical.

## Redirect URLs

Supabase Auth redirect allow-lists should include:

- `https://deepflownow.com/reset-password`
- `https://deepflownow.com/**`
- The local development reset URL when needed, such as
  `http://localhost:3000/reset-password`

## Security Guidance

- Never reveal whether an email exists in password recovery UI or email copy.
- Never log passwords, recovery tokens, or magic-link tokens.
- Never expose the Supabase service role key in browser code or client logs.
- Keep password reset links time-limited through Supabase defaults/settings.

## Implementation Notes

- Supabase hosted Auth template changes are usually applied in the Supabase
  Dashboard, not in this codebase.
- Do not implement custom auth email sending in this sprint unless DeepFlow
  already has a safe, reviewed pattern for that specific Auth email.
- Resend remains available for waitlist and product emails; do not route
  password recovery or signup confirmation through Resend without a separate
  security review.

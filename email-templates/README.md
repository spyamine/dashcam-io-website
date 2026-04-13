# Dashcam.io Email Templates

Branded HTML templates for the transactional emails Supabase sends on behalf of the dashcam-io project.

## Templates

| File | Supabase slot | When it fires |
|---|---|---|
| `confirm-signup.html` | **Confirm signup** | User just created an account, needs to verify their email before the first sign-in. |
| `recovery.html` | **Reset password** | User hit "forgot password" and Supabase is sending a one-time reset link. |
| `magic-link.html` | **Magic Link** | Passwordless sign-in (not used in the app today, but Supabase still sends one if the flow is triggered — template is here so the branding stays consistent if/when it is). |

All three use the same palette, spacing, and wordmark so a user who sees all of them recognizes the brand.

## Variables

Supabase renders templates with Go-template syntax. These are the variables that actually appear in these templates (there are more available — see https://supabase.com/docs/guides/auth/auth-email-templates):

| Variable | Meaning |
|---|---|
| `{{ .ConfirmationURL }}` | The signed URL the user must click. Supabase bakes the token, type, and `redirect_to` into it. **Always use this — never hand-construct the URL.** |
| `{{ .Email }}` | The email address the user is confirming / resetting / signing in as. Surfaced in bold so the user can double-check the right inbox. |

## Installing a template in Supabase

The Supabase CLI does not yet support pushing email templates, so this is a copy-paste step.

1. Open the Supabase dashboard for the **dashcam-io** project (not naTadabar).
2. **Authentication → Email Templates**.
3. Pick the template slot ("Confirm signup", "Reset password", or "Magic Link").
4. Copy the contents of the matching `.html` file in this directory.
5. Paste into the dashboard editor, replacing whatever is there. **Leave the subject line alone** unless you want to customize it too — sane defaults below.
6. Hit **Save**.
7. Send yourself a test email and look at it on both desktop Gmail and mobile Gmail. If anything renders wrong, edit the file here, commit, then re-paste.

### Suggested subject lines

- Confirm signup: `Confirm your Dashcam.io account`
- Reset password: `Reset your Dashcam.io password`
- Magic Link: `Your Dashcam.io sign-in link`

## Design constraints

Email HTML is not web HTML. If you edit these files, keep in mind:

- **Tables for layout.** Outlook renders with the Word engine, which ignores flexbox and most CSS positioning. Nested `<table>` is the only reliable layout primitive.
- **Inline CSS only.** Gmail, Yahoo Mail, and many Android mail apps strip `<style>` blocks. Every rule lives in a `style=""` attribute.
- **System font stack.** Don't pull in web fonts — mail clients block external requests.
- **Max width 560px.** Larger and mobile clients start squashing; smaller and desktop looks cramped.
- **No images.** All icons here are CSS-only (the teal "D" tile is a table cell). Images need absolute URLs, preview-pane suppression, and alt text — more surface area, more bugs.
- **`prefers-color-scheme`.** Declared in `<meta>` but not actually styled — both light- and dark-mode clients render the white card on gray background correctly. If that ever changes, add a `@media (prefers-color-scheme: dark)` block.

## Testing deliverability

After any template change, also re-run:

```sh
# See how Gmail scored the email
# (look at "Show original" on a received test)
```

And paste-test at https://www.mail-tester.com — aim for 9/10 or higher once custom SMTP is enabled.

# SMTP Setup for dashcam-io

Supabase's default SMTP works for testing but is **rate-limited to ~2 emails per hour** and sends from `noreply@mail.app.supabase.io`, which looks spammy and kills deliverability. For anything beyond your own dev account, you need a custom SMTP provider.

This document covers two options:

- **Option A: o2switch mailbox** (recommended for now) — uses the email account you already pay for via the byteflowers.com hosting. DKIM + SPF are already configured for the domain, so deliverability is reasonable and setup is a 5-minute cPanel task.
- **Option B: Resend** — better deliverability at scale, free up to 3,000 emails/month, requires adding a couple of DNS records. Worth it once you have real users.

Both plug into Supabase the same way at the end.

## Option A — o2switch SMTP

### 1. Create a mailbox in cPanel

1. Log into o2switch cPanel.
2. **Email → Email Accounts → Create.**
3. Domain: `byteflowers.com`.
4. Username: `noreply` (so the full address becomes `noreply@byteflowers.com`). Pick something else like `hello` or `accounts` if you prefer — the sender address is what users see in their inbox.
5. Storage: anything, default is fine. This mailbox never needs to receive replies; it's for sending only.
6. Generate a strong password and **save it to your password manager** — you'll paste it into Supabase in step 3.

### 2. Grab the SMTP settings from cPanel

After creating the mailbox, cPanel shows a **Connect Devices** / **Mail Client Configuration** panel. The settings you want:

```
Outgoing Server (SMTP):   mail.byteflowers.com   (or heaven.o2switch.net)
Port (SSL/TLS):           465
Port (STARTTLS):          587
Authentication:           Normal password
Username:                 noreply@byteflowers.com      (the FULL address, not just "noreply")
Password:                 (what you set in step 1)
```

Use **port 465 with SSL** in Supabase — it's the most reliable combination for cloud-to-o2switch.

### 3. Plug it into Supabase

1. Supabase Dashboard → **Project Settings → Auth → SMTP Settings.**
2. Toggle **Enable Custom SMTP** on.
3. Fill in:
   - **Sender email:** `noreply@byteflowers.com`
   - **Sender name:** `Dashcam.io`
   - **Host:** `mail.byteflowers.com`
   - **Port:** `465`
   - **Username:** `noreply@byteflowers.com`
   - **Password:** (from cPanel)
   - **Minimum interval between emails:** `60` seconds (Supabase default — keep it)
4. **Save.**
5. Scroll to the top of the Auth settings page and hit **Send test email** to your personal inbox. Check your inbox **and** your spam folder.

### 4. Verify DNS is still happy

The domain already has SPF + DKIM + DMARC configured via o2switch — no changes needed. Sanity-check from any terminal:

```sh
dig +short TXT byteflowers.com | grep spf
# → "v=spf1 +mx +a +ip4:109.234.162.85 +include:spf.jabatus.fr ~all"
dig +short TXT default._domainkey.byteflowers.com | head -c 80
# → "v=DKIM1; k=rsa; p=MIIBIjAN..."
dig +short TXT _dmarc.byteflowers.com
# → "v=DMARC1; p=quarantine; ..."
```

If all three are present, you're done.

### 5. Pros / cons

**Pros:**
- No new service to manage, no extra bill.
- Real `@byteflowers.com` sender — credible, builds brand trust.
- DNS is already configured.

**Cons:**
- Shared-hosting SMTP has lower throughput and occasionally lower reputation than dedicated transactional providers.
- No analytics (open rates, bounces, complaint handling).
- If the mailbox gets compromised, spammers can use it — rotate the password occasionally.

**For MVP volume this is fine.** Revisit when sign-ups exceed ~100/day or when deliverability starts showing up in the spam folder.

---

## Option B — Resend

Cleaner pipeline, free tier, proper analytics. Takes 15 minutes including DNS propagation.

### 1. Create a Resend account + verify the domain

1. Sign up at https://resend.com.
2. **Domains → Add Domain → `byteflowers.com`.**
3. Resend shows a list of DNS records to add. Typically:
   - A **TXT** at `send.byteflowers.com` (or `_amazonses.byteflowers.com`) — domain verification.
   - A **CNAME** at `resend._domainkey.byteflowers.com` → Resend's DKIM selector.
   - (Optional) A **TXT** at the apex for SPF — you already have SPF, so **do not replace it**; add `include:_spf.resend.com` to the existing record. You cannot have two separate `v=spf1` records for the same host.
4. Copy the exact records Resend generates.

### 2. Add the DNS records in cPanel

1. Log into o2switch cPanel.
2. **Domains → Zone Editor → byteflowers.com → Manage.**
3. Add each record Resend specified. Use the exact host and value they gave — copy-paste, don't retype. For TXT records o2switch sometimes wraps values with quotes automatically; don't double-quote.
4. Wait 5–30 minutes for propagation.
5. Back in Resend, click **Verify DNS**. Green checks = ready.

### 3. Generate an API key — but you want SMTP credentials

Resend primarily targets their REST API, but they do expose SMTP credentials for legacy integrations (Supabase is one):

1. Resend dashboard → **API Keys → Create API Key → Full Access** (or SMTP-only if available).
2. On the same page, scroll to **SMTP Settings**. The values are:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (STARTTLS)
   - **Username:** `resend`
   - **Password:** (the API key you just created — it doubles as the SMTP password)

### 4. Plug it into Supabase

1. Supabase Dashboard → **Project Settings → Auth → SMTP Settings.**
2. Fill in:
   - **Sender email:** `noreply@byteflowers.com`
   - **Sender name:** `Dashcam.io`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** (the Resend API key)
3. **Save** and send a test email.

### 5. Pros / cons

**Pros:**
- Higher sending limits (3K/mo free, much more on paid tiers).
- Proper analytics (opens, bounces, complaints) in the Resend dashboard.
- Suppression list — bounced addresses stop getting hit automatically.
- Better inbox reputation once you warm up.

**Cons:**
- One more account / bill / on-call surface.
- DNS changes require cPanel access and a propagation wait.
- The API-key-as-SMTP-password is unusual — rotating it means updating both Resend and Supabase.

---

## Troubleshooting

### Test email never arrives

1. Check spam. Dashcam.io is a new domain, so first few emails may land there.
2. Check Supabase **Logs → Auth** for SMTP errors. Common:
   - `535 Authentication failed` — password wrong or copy-paste picked up a trailing newline.
   - `550 Relay access denied` — username isn't the full email (missing `@byteflowers.com`).
   - `connection refused` — wrong port or the SMTP provider is blocking from Supabase's egress range.
3. From a terminal, try sending directly with `swaks` to isolate Supabase:
   ```sh
   brew install swaks
   swaks --to your@email.com \
         --from noreply@byteflowers.com \
         --server mail.byteflowers.com \
         --port 465 \
         --tls-on-connect \
         --auth-user noreply@byteflowers.com \
         --auth-password 'PASSWORD_HERE'
   ```
   If swaks works but Supabase doesn't, the SMTP provider isn't the problem — it's a Supabase config issue.

### Emails land in spam

1. Verify SPF, DKIM, DMARC are all passing — use https://www.mail-tester.com (paste-test, aim for 9+/10).
2. Warm up slowly. Don't send 500 emails on day one.
3. Keep the from-address stable — don't bounce between `noreply@` and `hello@`.
4. If using Option A and it's chronically filtered, switch to Option B.

### Rate limit errors in-app

Supabase has a per-project throttle (default: one email per 60 seconds per user). If you see `over_email_send_rate_limit`:
- For the Confirm signup flow, this is usually the user mashing "Resend" — tell them to wait.
- For systemic issues, raise the limit under **Auth → Rate Limits** (be careful — rate limits exist for a reason).

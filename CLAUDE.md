# dashcam-io-website

Static marketing + infrastructure site for the **dashcam-io** Android app. Deployed at [`https://dashcam.byteflowers.com`](https://dashcam.byteflowers.com) on o2switch shared hosting.

## Why this repo exists

Two jobs, one repo:

1. **Infrastructure for Android App Links + Supabase email confirmation.** The app's email signup flow depends on `/.well-known/assetlinks.json` being served from this domain — without it, Android won't verify the App Link and Supabase confirmation emails strand users in their browser instead of returning them to the app. This is the load-bearing reason the site exists.
2. **Marketing landing page** for the app — explains what dashcam-io does, shows the brand, links to download (coming soon on Play).

Everything else (email templates, SMTP docs) is supporting material used by the Android app's auth flow.

## Related repos

- `~/Developer/dashcam-io/` (`github.com/spyamine/dashcam-io`) — the Android/iOS monorepo. Contains the app whose SHA-256 fingerprint is registered in `public/.well-known/assetlinks.json`, and whose Supabase project consumes the email templates here.

## Tech stack

| | |
|---|---|
| Framework | Astro 5 (static output, zero JS by default) |
| Language | TypeScript |
| Styling | Scoped CSS + CSS custom properties (no Tailwind, no CSS frameworks) |
| Fonts | System font stack (SF Pro / Roboto / Segoe UI), matches the native apps |
| Build output | `dist/` (all static, rsync-ready) |
| Hosting | o2switch shared hosting, Apache, Let's Encrypt |

Minimum Node version: **18.20.8 / 20.3.0 / ≥22.0.0** (Astro 5 requirement).

## Repo layout

```
dashcam-io-website/
├── src/                    # Astro source
│   ├── pages/              # File-based routing — each .astro → HTML page
│   │   └── index.astro     # Landing page (/)
│   ├── layouts/            # Shared page chrome
│   │   └── BaseLayout.astro
│   ├── components/         # Page sections
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Privacy.astro
│   │   └── Footer.astro
│   └── styles/
│       └── global.css      # Palette tokens, resets, base typography
│
├── public/                 # Copied verbatim into dist/ at build time
│   ├── .htaccess           # ⚠ Apache config — DO NOT DELETE
│   ├── .well-known/
│   │   └── assetlinks.json # ⚠ Android App Links verification — DO NOT DELETE
│   ├── auth-callback/
│   │   └── index.html      # ⚠ Fallback for Supabase email deep link — DO NOT DELETE
│   └── icon.png            # App icon (source: iOS 1024x1024)
│
├── email-templates/        # NOT served — copy-paste into Supabase dashboard
│   ├── README.md
│   ├── confirm-signup.html
│   ├── recovery.html
│   └── magic-link.html
│
├── docs/
│   └── smtp-setup.md       # How to wire custom SMTP to Supabase
│
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── CLAUDE.md               # This file
```

## 🚨 Files you must NOT delete

These are load-bearing infrastructure — the Android app breaks immediately if they're missing or malformed. They all live under `public/` so Astro copies them into `dist/` untouched during build.

| Path in `public/` | Why it must exist |
|---|---|
| `.well-known/assetlinks.json` | Google's Digital Asset Links verifier fetches this. If it's 404 or has the wrong SHA-256, Android App Links verification fails and the Supabase email-confirmation flow falls back to a browser page that most users never figure out how to escape. **Keep the package name (`io.dashcam.android`) and the fingerprint array correct.** When the Play release keystore fingerprint is known, append it to the `sha256_cert_fingerprints` array — don't replace the debug fingerprint until the debug builds are retired. |
| `auth-callback/index.html` | Fallback page for Supabase email confirmation when App Link verification hasn't completed on a device (common on first install before Play Protect finishes domain verification). Parses `#access_token=…` fragments and `?token_hash=…` queries, attempts to open the app via `io.dashcam.android://auth-callback` custom scheme, and renders a friendly "Email confirmed — return to the app" card. **Must remain a standalone HTML file — do not rewrite as an Astro page.** The reasons: (a) it has to work when JavaScript frameworks aren't available, (b) it's the last-resort recovery path, (c) Astro hydration would add bytes the user doesn't need. |
| `.htaccess` | Apache config. Critical rules: `AddType application/json .json` forces the correct MIME type for `assetlinks.json` (Google's verifier rejects `text/html`), `Header set Cache-Control` keeps the assetlinks TTL short so you can fix it fast if it's wrong, and `DirectoryIndex index.html` lets `/auth-callback/` resolve without a trailing filename. If you delete this, `assetlinks.json` is served as `text/html` and App Links break silently. |

## 📁 Files the site uses but doesn't serve

| Path | Purpose |
|---|---|
| `email-templates/*.html` | Branded HTML for Supabase email templates (confirm signup, recovery, magic link). NOT served from the web — they exist here so they're version-controlled and git-diffable. Installed into the Supabase dashcam-io project either via `PATCH /v1/projects/{ref}/config/auth` (Management API) or by copy-pasting in the dashboard. See `email-templates/README.md`. |
| `docs/smtp-setup.md` | Step-by-step for wiring o2switch's `noreply@byteflowers.com` mailbox into Supabase as custom SMTP. Includes the `mail.heaven.o2switch.net` cert-hostname gotcha and the `smtp_port`-must-be-string quirk of Supabase's Management API. |

## Design system

Must match the native apps (same palette = same brand). Tokens live in `src/styles/global.css` as CSS custom properties.

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#00C7BE` | Primary CTA, brand accent, wordmark tile |
| `--color-primary-dark` | `#00A89F` | Pressed states, link hover |
| `--color-primary-light` | `#5FDFDA` | Highlight, hover backgrounds |
| `--color-sky` | `#5AC8FA` | Secondary accent, info chips |
| `--color-bg` | `#F2F2F7` | Page background (iOS `systemGroupedBackground`) |
| `--color-card` | `#FFFFFF` | Cards, content surfaces |
| `--color-border` | `#E5E5EA` | Dividers, card borders |
| `--color-text` | `#000000` | Headlines, primary text |
| `--color-text-muted` | `#8E8E93` | Subtitles, captions |

Typography: system font stack only (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`). Do not pull in Google Fonts or any external CSS — keeps page weight down and matches the iOS feel.

## Development

```sh
npm install           # First time only
npm run dev           # Dev server on http://localhost:4321
npm run build         # Builds into dist/
npm run preview       # Serve dist/ locally for a smoke test
```

Before any build runs, Astro reads `public/` contents. If you change `public/.well-known/assetlinks.json`, run `npm run build` and then re-verify at Google's public endpoint (see Deploy → Verify below).

## Deploy

The remote is o2switch shared hosting. No Node runtime there — we ship the `dist/` output as static files.

```sh
# 1. Build
npm run build

# 2. Deploy (SSH alias `o2switch` must be configured in ~/.ssh/config)
rsync -avz --delete \
  --exclude='.git' \
  dist/ o2switch:dashcam.byteflowers.com/
```

**Gotchas:**

- Every SSH/rsync command to o2switch needs `LC_ALL=C` inside the remote shell, otherwise perl locale warnings flood stderr. `rsync` needs `--rsync-path="LC_ALL=C rsync"`.
- `--delete` removes files on the remote that aren't in `dist/`. This is what you want — it keeps the remote clean. **Exception**: if cPanel AutoSSL left Let's Encrypt challenge files under `.well-known/acme-challenge/`, `--delete` would wipe them. The workaround is to exclude that path: `--exclude='.well-known/acme-challenge/'`.
- File permissions should end up `644` for files and `755` for dirs. rsync preserves local perms by default, so just `chmod -R u+rwX,go+rX,go-w dist/` before deploying if you've been editing on macOS.

### Verify after deploy

```sh
# assetlinks.json served as JSON, not HTML
curl -sI https://dashcam.byteflowers.com/.well-known/assetlinks.json | grep -i content-type
# → content-type: application/json

# Google's Digital Asset Links verifier
curl -s "https://digitalassetlinks.googleapis.com/v1/assetlinks:check\
?source.web.site=https://dashcam.byteflowers.com\
&relation=delegate_permission/common.handle_all_urls\
&target.android_app.package_name=io.dashcam.android\
&target.android_app.certificate.sha256_fingerprint=BF:BB:59:51:42:F7:DB:B4:42:C3:D7:0F:B7:AC:4F:41:EB:A3:5D:1A:6C:21:F9:4E:0B:9D:C9:09:14:E9:85:19"
# → {"linked": true, ...}

# On device
adb shell pm get-app-links io.dashcam.android
# → dashcam.byteflowers.com: verified
```

If any of these fail, **do not leave the site in that state** — either roll back the deploy or fix forward immediately. A broken assetlinks.json silently breaks every new Android signup.

## TLS / cert dependency

This site's TLS cert is managed by **cPanel AutoSSL** on o2switch, backed by Let's Encrypt. If the cert expires or somehow reverts to a self-signed cert (happened once during initial setup), Google's verifier returns `ERROR_CODE_FAILED_SSL_VALIDATION` and Android App Links break — even though the files are correct. Fix by clicking **SSL/TLS Status → Run AutoSSL For User** in cPanel. Takes ~60 seconds.

## Scope boundaries (things this site does NOT do)

- **No forms, no lead capture, no signup.** The Android app owns that flow through Supabase.
- **No analytics.** No GA, no Plausible, no PostHog on the web. The app sends PostHog events; the website stays quiet.
- **No blog, no CMS.** If we ever want a blog we can add `/blog/*.md` to Astro, but it's not planned.
- **No client-side JS frameworks on `/auth-callback/`.** It's deliberately standalone vanilla HTML + inline CSS + a few lines of vanilla JS. Do not "upgrade" it.
- **No tracking cookies.** Anything that would need a cookie banner shouldn't be on this site.

## Things to reconsider / open questions

- When the Play release keystore is generated, the release SHA-256 must be appended to `public/.well-known/assetlinks.json` **before** the first release ships — otherwise Android App Links fail for every Play-installed user. Today only the debug fingerprint is listed.
- The landing page currently has a "Coming soon on Google Play" badge. When the app actually ships, replace that with a real store link.
- If we ever add an iOS App Site Association file (`apple-app-site-association`), it lives alongside `assetlinks.json` under `public/.well-known/`. Same must-not-delete rules apply.

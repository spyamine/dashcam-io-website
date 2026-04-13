# dashcam-io-website

Static marketing site + authentication infrastructure for the **[dashcam-io](https://github.com/spyamine/dashcam-io)** Android app. Deployed at [https://dashcam.byteflowers.com](https://dashcam.byteflowers.com).

Built with **Astro 5** + **TypeScript**. Zero client-side JS frameworks on the landing page, vanilla HTML/CSS/JS on the auth-callback fallback page.

## What's in this repo

```
.
├── src/
│   ├── pages/index.astro        Landing page (/)
│   ├── layouts/BaseLayout.astro HTML shell + meta tags
│   ├── components/              Hero, Features, Privacy, Download, Footer, Nav
│   └── styles/global.css        Design tokens (teal-first, Apple-inspired)
│
├── public/                      Copied verbatim into dist/ at build time
│   ├── icon.png                 App icon (1024×1024, source: iOS asset)
│   ├── .htaccess                ⚠ DO NOT DELETE — Apache config for assetlinks MIME type
│   ├── .well-known/
│   │   └── assetlinks.json      ⚠ DO NOT DELETE — Android App Links verification
│   └── auth-callback/
│       └── index.html           ⚠ DO NOT DELETE — Supabase email-confirmation fallback
│
├── email-templates/             Branded Supabase email templates (not web-served)
│   ├── confirm-signup.html
│   ├── recovery.html
│   ├── magic-link.html
│   └── README.md
│
├── docs/
│   └── smtp-setup.md            How to wire custom SMTP to Supabase
│
└── CLAUDE.md                    Detailed docs for AI coding agents
```

## Why the auth files exist

The Android app's Supabase email-confirmation flow relies on:

1. **`/.well-known/assetlinks.json`** — Google's Digital Asset Links verifier fetches this to confirm the site owns the Android App Link for `io.dashcam.android`. Without it (or with a wrong SHA-256 fingerprint), Android won't intercept the https redirect from the verification email, and users get stranded in their browser.
2. **`/auth-callback/index.html`** — the fallback page shown when a device hasn't finished App Link verification yet. Parses tokens from the URL fragment, tries the `io.dashcam.android://` custom scheme, and renders a friendly "Email confirmed" card.
3. **`.htaccess`** — forces `application/json` MIME type on `assetlinks.json` (Google's verifier rejects `text/html`) and sets `DirectoryIndex` so `/auth-callback/` resolves.

**These three files are load-bearing. If you "clean up" any of them, Android signup breaks silently.**

## Development

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/
npm run preview   # serve dist/ locally
```

## Deploy (o2switch)

Static output, rsynced to shared hosting:

```sh
npm run build

rsync -avz --delete \
  --exclude='.well-known/acme-challenge/' \
  --rsync-path="LC_ALL=C rsync" \
  dist/ o2switch:dashcam.byteflowers.com/
```

After deploy, verify Android App Links still work:

```sh
curl -sI https://dashcam.byteflowers.com/.well-known/assetlinks.json | grep content-type
# → application/json

curl -s "https://digitalassetlinks.googleapis.com/v1/assetlinks:check?source.web.site=https://dashcam.byteflowers.com&relation=delegate_permission/common.handle_all_urls&target.android_app.package_name=io.dashcam.android&target.android_app.certificate.sha256_fingerprint=BF:BB:59:51:42:F7:DB:B4:42:C3:D7:0F:B7:AC:4F:41:EB:A3:5D:1A:6C:21:F9:4E:0B:9D:C9:09:14:E9:85:19"
# → {"linked": true, ...}
```

Detailed deployment notes, gotchas (TLS cert dependency, locale spam), and design-system docs live in [`CLAUDE.md`](./CLAUDE.md).

## License

Part of the dashcam-io project by [ByteFlowers](https://byteflowers.com).

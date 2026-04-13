# dashcam-io-website

Static site for [dashcam.byteflowers.com](https://dashcam.byteflowers.com).

Mirrors the document root on o2switch — file layout here matches exactly what's uploaded.

## What's here

```
.
├── .htaccess                    Apache config: JSON MIME for assetlinks, cache headers
├── .well-known/
│   └── assetlinks.json          Android App Links verification (Digital Asset Links)
├── auth-callback/
│   └── index.html               Fallback page for Supabase email confirmation deep link
└── index.html                   Landing page
```

## Purpose

The only reason this site exists today is to support **Android App Links** for the dashcam-io Android app. Supabase email confirmation links need an `https://` redirect target that Android can verify and intercept, because Chrome/Gmail in-app browsers silently block `https://` → custom-scheme redirects.

- `assetlinks.json` declares the package name + signing fingerprint Android should trust.
- `/auth-callback/` is the intercepted path — Android opens the app directly when verified; the HTML is the fallback for desktop browsers / unverified devices.
- `/` is a minimal landing card so the domain doesn't 404.

## Deployment

Hosted on **o2switch** (`heaven.o2switch.net`), user `gumo7257`. Document root on the server:

```
~/dashcam.byteflowers.com/
```

Deploy with rsync (SSH alias `o2switch` configured in `~/.ssh/config`):

```sh
rsync -avz --exclude='.git' --exclude='README.md' ./ o2switch:dashcam.byteflowers.com/
```

The SSH alias uses locale `C` inside the remote shell — the user's environment spams perl locale warnings otherwise.

## Known blockers

- **TLS:** the vhost currently serves a self-signed cert. Google's Digital Asset Links verifier returns `ERROR_CODE_FAILED_SSL_VALIDATION` until a publicly-trusted cert is installed. Fix via cPanel → "SSL/TLS Status" or "Let's Encrypt™ SSL" (one-click AutoSSL). Once installed, App Links verification should flip to `linked: true` with no file changes.
- **Release signing fingerprint:** `assetlinks.json` currently contains only the debug keystore SHA-256. Before shipping to Play, append the Play App Signing certificate fingerprint to `target.sha256_cert_fingerprints`.

## Verification

After deploy, Google's public verifier (no auth required):

```sh
curl -s "https://digitalassetlinks.googleapis.com/v1/assetlinks:check\
?source.web.site=https://dashcam.byteflowers.com\
&relation=delegate_permission/common.handle_all_urls\
&target.android_app.package_name=io.dashcam.android\
&target.android_app.certificate.sha256_fingerprint=<SHA-256>"
```

Expect `"linked": true`.

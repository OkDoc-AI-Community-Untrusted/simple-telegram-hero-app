# Simple Telegram Hero App — OkDoc Plugin

A Telegram web client built as an [OkDoc](https://okdoc.ai) iframe plugin using Angular, Ionic, and [GramJS](https://gram.js.org).

## Quick Start

```bash
npm install
ng serve
```

Open `http://localhost:4200/`. If no Telegram API credentials are configured, the login page automatically asks you to provide your own.

---

## Telegram API Setup

The app needs a Telegram **API ID** and **API Hash** to connect. There are two ways to provide them:

### Option 1 — Bring your own credentials (default for local dev)

When no built-in credentials are configured, the login page automatically shows the credential fields.

1. Go to [my.telegram.org](https://my.telegram.org) and log in with your Telegram phone number.
2. Telegram sends a **confirmation code** to your Telegram app (not SMS) — enter it.
3. Click **"API development tools"**.
4. Create an app:
   - **App title**: anything (e.g., "My Telegram Client")
   - **Short name**: a short identifier (e.g., "mytgclient")
   - **Platform**: **Web**
5. Copy the **API ID** (a number like `12345678`) and **API Hash** (a string like `a1b2c3d4e5...`).
6. Paste them into the login form, enter your phone number, and click **Connect**.

> **Keep your API Hash private.** Never share it publicly or commit it to a public repository.

### Option 2 — Inject via GitHub Actions secrets (for deployments)

To ship the app with built-in credentials so users only need their phone number:

1. In your GitHub repo go to **Settings → Secrets and variables → Actions**.
2. Add two repository secrets:
   - `TELEGRAM_API_ID` — your numeric API ID
   - `TELEGRAM_API_HASH` — your API hash string
3. Push to `main` — the GitHub Actions workflow replaces the placeholder values
   `TELEGRAM_API_ID_PLACEHOLDER` and `TELEGRAM_API_HASH_PLACEHOLDER`
   in `src/environments/environment.interface.ts` at build time, then builds and deploys.
4. Credentials never appear in source code.

> If the secrets are **not** set, the placeholders remain and users are automatically prompted to provide their own credentials.

---

## Logging In

1. Enter your **phone number** (with country code, e.g., `+1234567890`).
2. If no built-in credentials exist, provide your **API ID** and **API Hash** (see above).
   - If built-in credentials are configured, you can still override them via the **"Advanced options"** toggle.
3. Click **Connect** → Telegram sends a **verification code** to your app.
4. Enter the code. If you have **2FA** enabled, enter your password on the next screen.
5. Done — you'll be redirected to your contacts list.

---

## Using the App

- **Contacts / Chats**: Browse your Telegram contacts and recent conversations.
- **Chat**: Tap a contact or chat to open a conversation — send and receive text messages.
- **Logout**: Click the logout button on the contacts page to sign out and clear your session.

---

## Project Structure

| Path | Description |
|------|-------------|
| `src/environments/` | Environment configs with credential placeholders |
| `src/app/services/telegram.service.ts` | GramJS client wrapper |
| `src/app/services/okdoc.service.ts` | OkDoc iframe SDK integration |
| `src/app/pages/login/` | Login with phone + optional API credentials |
| `src/app/pages/contacts/` | Contacts & chats list |
| `src/app/pages/chat/` | Chat conversation view |
| `stubs/` | Node.js module stubs for GramJS browser compatibility |
| `.github/workflows/deploy.yml` | GitHub Pages deployment with secret injection |

## Building

```bash
ng build
```

Production build swaps `environment.ts` → `environment.prod.ts` (configured in `angular.json`).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connect" button disabled | Ensure phone number is filled; if no built-in creds, provide API ID + Hash |
| Credential fields shown automatically | No built-in API credentials — provide your own from [my.telegram.org](https://my.telegram.org) |
| Auth error resets to first screen | Expected — enter phone and click Connect to retry |
| "Invalid API ID" error | Double-check the numeric ID from my.telegram.org |
| No verification code received | Check your Telegram app (not SMS). Wait a few minutes and retry. |
| `FLOOD_WAIT` error | Too many attempts — wait the indicated time |
| Blank contacts list | Ensure you have contacts saved in your Telegram app |

---

## Additional Resources

- [Angular CLI](https://angular.dev/tools/cli) — command reference
- [OkDoc Plugin Docs](https://docs.okdoc.ai) — iframe SDK documentation
- [GramJS Docs](https://gram.js.org) — Telegram client library

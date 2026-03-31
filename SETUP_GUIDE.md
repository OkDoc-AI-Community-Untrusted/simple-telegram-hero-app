# Telegram OkDoc Plugin — Setup Guide

## How to Get Your Telegram API Credentials

The app needs three things to log in:
1. **API ID** — a numeric ID for your Telegram app
2. **API Hash** — a secret string tied to your API ID
3. **Phone Number** — your Telegram account phone number (with country code)

### Step 1: Get API ID & API Hash

1. Go to **[https://my.telegram.org](https://my.telegram.org)** in your browser.
2. Log in with your **Telegram phone number** (the same one you use in the Telegram app).
3. Telegram will send a **confirmation code** to your Telegram app (not SMS). Enter it.
4. Once logged in, click **"API development tools"**.
5. If you haven't created an app yet, fill in the form:
   - **App title**: anything you want (e.g., "My Telegram Client")
   - **Short name**: a short identifier (e.g., "mytgclient")
   - **Platform**: choose **Web**
   - **Description**: optional
6. Click **"Create application"**.
7. You'll see your **API ID** (a number like `12345678`) and **API Hash** (a string like `a1b2c3d4e5f6...`).

> **Important:** Keep your API Hash secret. Never share it publicly or commit it to a public repository.

### Step 2: Enter Credentials in the App

1. Open the app at `http://localhost:4200`.
2. Enter your **API ID** in the first field.
3. Enter your **API Hash** in the second field.
4. Enter your **Phone Number** with country code (e.g., `+1234567890`, `+972501234567`).
5. Click **Connect**.

### Step 3: Verify Your Account

1. After clicking Connect, Telegram will send a **verification code** to your Telegram app.
2. Enter the code in the input field that appears.
3. If you have **Two-Factor Authentication (2FA)** enabled, you'll be asked for your password next.
4. Once verified, you'll be redirected to your **contacts list**.

### Using the App

- **Contacts page**: Shows all your Telegram contacts. Tap a contact to open a chat.
- **Chat page**: View and send text messages to the selected contact.
- **Logout**: Click the logout button on the contacts page to sign out.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connect" button is disabled | Make sure all three fields are filled in |
| "Invalid API ID" error | Double-check the numeric ID from my.telegram.org |
| No verification code received | Check your Telegram app (not SMS). Try again in a few minutes. |
| "FLOOD_WAIT" error | You've made too many attempts. Wait the specified time and try again. |
| Blank contacts list | Make sure you have contacts saved in your Telegram app |

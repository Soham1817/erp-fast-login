# IIT KGP ERP Fast Login

A PIN-protected, Manifest V3 Chrome Extension that automates the entire **IIT Kharagpur ERP** login flow—including dynamic security question matching and automatic Gmail OTP fetching.

---

## Features

* **4-Digit PIN Gate**: Doesn't auto-fill on page refresh. Prompts for a 4-digit PIN in a floating widget before running.
* **Local AES-GCM Encryption**: Credentials and security answers are encrypted at rest in `chrome.storage.local` using the Web Crypto API (`PBKDF2` + `AES-GCM-256`) derived from your PIN. Nothing is synced to the cloud.
* **Dynamic Security Question Matching**: Automatically detects the security question loaded by ERP and fills the matching answer.
* **Automatic Gmail OTP Fetching**: Polls the Gmail API for the fresh 6-digit OTP arriving *after* `Get OTP` is clicked, fills it in, and submits the form.
* **Alert Suppression**: Silences ERP's blocking `window.alert()` popup after clicking `Get OTP` so the flow never stalls.

---

## Project Structure

```text
erp-fast-login/
├── manifest.json   # Extension config, permissions, and OAuth2 client ID
├── crypto.js       # PBKDF2 + AES-GCM encryption/decryption helpers
├── background.js   # Service worker handling Gmail OAuth & OTP polling
├── inject.js       # MAIN-world script to suppress blocking OTP alerts
├── content.js      # Floating PIN UI and ERP DOM automation pipeline
├── popup.html      # Local settings & credential setup UI
└── popup.js        # Saves encrypted credentials and triggers Gmail OAuth
```

---

## Setup & Installation

### 1. Load the Extension
1. Clone or download this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `erp-fast-login` folder.
5. Copy the 32-character **Extension ID** shown on the extension card.

### 2. Configure Gmail API (OAuth 2.0)
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Go to **APIs & Services → Library**, search for **Gmail API**, and click **Enable**.
3. Go to **Google Auth Platform → Audience** *(or **OAuth consent screen**)*.
   * Set User Type to **External** (Testing mode).
   * Under **Test users**, add the Gmail address where you receive ERP OTPs (personal Gmail or `@kgpian.iitkgp.ac.in`).
4. Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
   * Application type: **Chrome Extension**.
   * Item ID: Paste your 32-character **Extension ID**.
5. Copy the generated **Client ID**, paste it into `manifest.json` replacing `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`, and click the **Reload (↻)** icon on the extension card in `chrome://extensions`.

### 3. Save Credentials
1. Click the **IIT KGP ERP Fast Login** icon in your Chrome toolbar.
2. Enter your **Roll No / User ID**, **ERP Password**, **3 Security Question keywords & answers**, and a **4-digit PIN**.
3. Click **Encrypt & Save**.
4. Click **Connect Gmail (for OTP)** and approve the read-only Gmail permission.

---

## Usage

1. Navigate to the [IIT KGP ERP Login Page](https://erp.iitkgp.ac.in/SSOAdministration/login.htm).
2. Type your 4-digit PIN into the **⚡ ERP Fast Login** box at the top right.
3. The extension will decrypt your credentials, answer the security question, request the OTP, fetch it from Gmail, and log you in automatically.

---

## Security & Privacy

* **Zero External Servers**: The extension only communicates with `erp.iitkgp.ac.in` and Google's official `gmail.googleapis.com` API.
* **Minimal Permissions**: Only requests `gmail.readonly` scope to read incoming OTP snippets.
* **Local-Only Storage**: Encrypted blobs stay strictly on your local machine in `chrome.storage.local`.

---

## ⚠️ Disclaimer

This is an unofficial, personal productivity tool and is not affiliated with IIT Kharagpur. Use at your own discretion.

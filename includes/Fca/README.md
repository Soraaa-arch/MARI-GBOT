# 🎀 @rxabdullah/xdi-fca (rX 〄)

An advanced, feature-rich, and extremely robust unofficial **Facebook Chat API (FCA)** library for Node.js. Built for speed, reliability, and security, this library features built-in **Labyrinth End-to-End Encryption (E2EE)** support, **MQTT Live Bridge**, **Silent Hosted Image Uploading**, and a fully automated, customizable **Auto Update System**.

---

## 🌟 Features

| Feature | Description |
| :--- | :--- |
| **🔐 Labyrinth E2EE Support** | Automatically decrypts and encrypts messages in Facebook's End-to-End Encrypted chats using a native Labyrinth secure bridge. |
| **🔄 Auto Update System** | Automatically detects newer versions on the NPM registry, downloads/installs them, updates the local project `package.json`, and restarts to apply changes. |
| **📡 MQTT Live Bridge** | Full real-time message listening, reaction tracking, typing indicators, and read receipts via a robust background MQTT connection. |
| **🖼️ Silent Attachment Hosting** | Seamlessly uploads local media/decrypted attachments to ImgBB and ImageKit silently when hosting is required. |
| **🎯 Advanced Typing Indicator** | Simulates human typing behavior with configurable durations for realism. |
| **🛡️ Anti-Logout Protection** | Smart sessions and auto-reconnection keep your bot logged in without getting hit by sudden checkpoint/approvals logouts. |

---

## 🔄 Auto Update System

Our auto-update system works asynchronously and does not block your bot's startup process.

### How it Works:
1. **Version Check**: During bot login, the system queries the NPM registry for the latest version of the running package name.
2. **Dynamic Name Matching**: It automatically reads your `package.json` package name (`rx-fca`, `@rxabdullah/xdi-fca`, or custom fork names) to check for updates.
3. **Robust Comparison**: Safely parses semantic versions (handles beta/pre-release tags like `1.2.3-beta.1` without crashing or returning `NaN`).
4. **Local Updates**: Downloads the newest version using `npm install <package>@latest --save` and updates all matching dependencies in your `package.json`.
5. **Restart**: Automatically exits the process with exit code `2`. Process managers like **PM2**, **Nodemon**, or custom bash loops will notice this and instantly restart the bot with the new updates applied.

### How to Disable Auto Update:
If you are developing locally or want to lock your FCA version, you can disable the auto-updater by passing `autoUpdate: false` in the login options:

```javascript
fca({ appState }, { autoUpdate: false }, (err, api) => {
    if (err) return console.error(err);
    // Bot logic here
});
```

---

## ⚙️ How to Call and Integrate

Below is a quick guide on how to integrate and initialize **Maria-fca** in popular chatbot frameworks like **Goatbot** and **Mirai**.

### 1. 🐐 Goatbot Integration
Goatbot naturally integrates FCA in its main process or login handler (often located inside `index.js`, `login.js`, or the core runner).

#### Configuration Table:
| Option Key | Recommended Value | Description |
| :--- | :--- | :--- |
| `autoUpdate` | `true` or `false` | Enable or disable the FCA auto-updater |
| `enableE2EE` | `true` | Turn on End-to-End Encryption support |
| `e2ee.saveType` | `"path"` | Set where E2EE device files are stored (`"path"` / `"memory"`) |
| `e2ee.devicePath` | `"./e2ee_device.json"` | Path to store your persistent device key pairs |

#### Call/Login Example:
```javascript
const fca = require('@rxabdullah/xdi-fca');
const fs = require('fs');
const path = require('path');

const appState = JSON.parse(fs.readFileSync('./cookie.txt', 'utf8'));

const fcaOptions = {
    autoUpdate: true,        // Enable auto updates
    selfListen: false,       // Don't listen to bot's own messages
    listenEvents: true,      // Listen to events like join/leave/reactions
    enableE2EE: true,        // Enable E2EE
    e2eeMemoryOnly: false,   // Save key files locally
    e2eeDevicePath: path.join(process.cwd(), 'e2ee_device.json')
};

fca({ appState }, fcaOptions, async (err, api) => {
    if (err) {
        console.error('❌ Goatbot Login Failed:', err);
        return;
    }

    console.log(`✅ Goatbot logged in as UID: ${api.getCurrentUserID()}`);

    // If E2EE is enabled, initialize the client connection
    if (fcaOptions.enableE2EE) {
        console.log('📡 Connecting E2EE Client...');
        api.connectE2EE((e2eeErr, event) => {
            if (e2eeErr) return console.error('E2EE Error:', e2eeErr);
            if (event.type === 'e2ee_fully_ready') {
                console.log('🔒 E2EE Client Connected and Secured!');
            }
        });
    }

    // Start listening to MQTT messages
    api.listenMqtt((listenErr, event) => {
        if (listenErr) return console.error(listenErr);
        // Feed the event into Goatbot's command handler
        // global.GoatBot.handleEvent(api, event);
    });
});
```

---

### 2. 🌸 Mirai Integration
In the **Mirai** framework, FCA is loaded in the login process (usually inside `login/index.js` or `mirai.js`).

#### Configuration Table:
| Configuration Field | Value | Purpose |
| :--- | :--- | :--- |
| `autoUpdate` | `true` | Enable automated latest features & security patches |
| `selfListen` | `false` | Prevent loop triggers |
| `autoMarkRead` | `true` | Automatically mark incoming chats as read |

#### Call/Login Example:
```javascript
const login = require('@rxabdullah/xdi-fca');
const fs = require('fs');

function startMiraiBot() {
    let appState;
    try {
        appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));
    } catch (e) {
        console.error('❌ AppState file is missing or corrupted!');
        return;
    }

    const miraiFcaOptions = {
        autoUpdate: true,      // Auto update active
        selfListen: false,
        listenEvents: true,
        autoMarkRead: true,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
    };

    login({ appState }, miraiFcaOptions, (err, api) => {
        if (err) {
            console.error('❌ Mirai login failed:', err);
            // Fallback actions or restart
            return;
        }

        console.log(`🤖 Mirai Bot Online! User ID: ${api.getCurrentUserID()}`);

        // Handle E2EE if active
        if (miraiFcaOptions.enableE2EE) {
            api.connectE2EE(() => {});
        }

        // Initialize Mirai Listener
        api.listenMqtt((err, event) => {
            if (err) return console.error('Listener error:', err);
            // Pass the event to Mirai's main command executor
        });
    });
}

startMiraiBot();
```

---

## 💖 Support / Donate

If this project has been useful to you, consider supporting its development:

**bKash:** `01317604783`

---

## 📄 License & Credits

This project is licensed under the MIT License. Special thanks to all contributors who worked on enhancing the Facebook Messenger Labyrinth E2EE protocol and stabilizing the background MQTT bridge connection!

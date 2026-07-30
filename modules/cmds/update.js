const fs = require("fs-extra");
const path = require("path");
const { checkAndSelfUpdate } = require("../../includes/rX/autoUpdate.js");

module.exports = {
  config: {
    name: "update",
    aliases: ["gitupdate", "selfupdate"],
    version: "1.0",
    author: "EryXenX",
    countDown: 10,
    role: 3,
    category: "owner",
    description: {
      vi: "Kiểm tra và tự động cập nhật bot từ GitHub repo (config.json > gitUpdate)",
      en: "Check config.json > gitUpdate.url on GitHub and self-update the bot if a newer version exists"
    },
    guide: {
      vi: "   {pn}: Kiểm tra bản cập nhật mới nhất và tự động áp dụng nếu có",
      en: "   {pn}: Check for the latest version and apply it automatically if found"
    }
  },

  langs: {
    vi: {
      notAdmin: "🚫 | Chỉ admin bot mới có thể dùng lệnh này.",
      checking: "🔍 | Đang kiểm tra bản cập nhật...",
      upToDate: "✅ | Bot đã ở phiên bản mới nhất (v%1).",
      noRepo: "⚠ | Chưa cấu hình repo GitHub. Vui lòng đặt config.json > gitUpdate.url.",
      error: "💥 | Kiểm tra cập nhật thất bại:\n%1",
    },
    en: {
      notAdmin: "🚫 | This command is restricted to bot admins only.",
      checking: "🔍 | Checking for updates...",
      upToDate: "✅ | Bot is already up to date (v%1).",
      noRepo: "⚠ | No GitHub repo configured. Set config.json > gitUpdate.url first.",
      error: "💥 | Update check failed:\n%1",
    }
  },

  onLoad({ api }) {
    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pathFile = path.join(tmpDir, "update.txt");
    if (fs.existsSync(pathFile)) {
      setTimeout(() => {
        try {
          const [tid, , fromVersion, toVersion] = fs.readFileSync(pathFile, "utf-8").split(" ");
          api.sendMessage(`✅ | Update applied: v${fromVersion} → v${toVersion}.\n🔄 | Bot restarted successfully and is back online.`, tid);
          fs.unlinkSync(pathFile);
        } catch (e) {
          console.error("Update notify error:", e);
        }
      }, 2000);
    }
  },

  onStart: async function ({ message, event, getLang }) {
    const admins = global.GoatBot?.config?.adminBot || [];
    if (!admins.includes(event.senderID)) return message.reply(getLang("notAdmin"));

    await message.reply(getLang("checking"));

    const result = await checkAndSelfUpdate(process.cwd(), {
      force: true,
      notifyThreadID: event.threadID
    });

    // If an update was found and applied, checkAndSelfUpdate already wrote
    // the restart marker and called process.exit(2) — this line is never
    // reached in that case, the onLoad hook above reports back instead.
    if (result?.error) return message.reply(getLang("error", result.error));
    if (result?.noRepo) return message.reply(getLang("noRepo"));

    return message.reply(getLang("upToDate", result?.localVersion || "?"));
  }
};

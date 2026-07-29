const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ownerInfo = {
  name: "𝚁𝚂• 𝚁𝙸𝚏𝙰𝚃",
  facebook: "https://facebook.com/61557500431580",
  telegram: "@rifat5546",
  supportGroup: "https://m.me/61557500431580"
};

module.exports = {
  config: {
    name: "botjoin",
    version: "2.0",
    author: "Saimx69x",
    category: "events"
  },

  onStart: async function ({ event, api, message }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const botID = api.getCurrentUserID();
    const addedUsers = logMessageData.addedParticipants;

    const isBotAdded = addedUsers.some(u => u.userFbId === botID);
    if (!isBotAdded) return;

    const nickNameBot = global.GoatBot.config.nickNameBot || "Sakura Bot";
    const prefix = global.utils.getPrefix(threadID);
    const BOT_UID = botID; 

    try {
      
      await api.changeNickname(nickNameBot, threadID, botID);
    } catch (err) {
      console.warn("⚠️ Nickname change failed:", err.message);
    }

    try {
      
      const API_ENDPOINT = "https://xsaim8x-xxx-api.onrender.com/api/botjoin"; 
      
      const apiUrl = `${API_ENDPOINT}?botuid=${BOT_UID}&prefix=${encodeURIComponent(prefix)}`;
      
      const tmpDir = path.join(__dirname, "..", "cache");
      await fs.ensureDir(tmpDir);
      const imagePath = path.join(tmpDir, `botjoin_image_${threadID}.png`);

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, response.data);

      const textMsg = [
        "🎀 𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 🎀",
        `🔹 𝐁𝐨𝐭 𝐩𝐫𝐞𝐟𝐢𝐱: ${prefix}`,
        `🔸 𝐓𝐲𝐩𝐞: ${prefix}help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `👑 𝐎𝐰𝐧𝐞𝐫: ${ownerInfo.name}`,
        `🌐 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: ${ownerInfo.facebook}`,
        `✈️ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: ${ownerInfo.telegram}`,
        `🤖 𝐉𝐨𝐢𝐧 𝐒𝐮𝐩𝐩𝐨𝐫𝐭 𝐆𝐂: ${ownerInfo.supportGroup}`
      ].join("\n");


      await api.sendMessage({
        body: textMsg,
        attachment: fs.createReadStream(imagePath)
      }, threadID);

      fs.unlinkSync(imagePath);

    } catch (err) {
      console.error("⚠️ Error sending botjoin message:", err);
      
      const fallbackMsg = [
        "🎀 𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 🎀:",
        "☎️ 𝙸𝚏 𝚢𝚘𝚞 𝚑𝚊𝚟𝚎 𝚊𝚗𝚢 𝚙𝚛𝚘𝚋𝚕𝚎𝚖𝚜, 𝚙𝚕𝚎𝚊𝚜𝚎 𝚌𝚘𝚗𝚝𝚊𝚌𝚝 𝚝𝚑𝚎 𝚊𝚍𝚖𝚒𝚗.",
        `🔹 𝐁𝐨𝐭 𝐩𝐫𝐞𝐟𝐢𝐱: ${prefix}`,
        `🔸 𝐓𝐲𝐩𝐞: ${prefix}help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `👑 𝐎𝐰𝐧𝐞𝐫: ${ownerInfo.name}`,
        `🌐 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: ${ownerInfo.facebook}`,
        `✈️ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: ${ownerInfo.telegram}`,
        `🤖 𝐉𝐨𝐢𝐧 𝐒𝐮𝐩𝐩𝐨𝐫𝐭 𝐆𝐂: ${ownerInfo.supportGroup}`
      ].join("\n");
      api.sendMessage(fallbackMsg, threadID);
    }
  }
};

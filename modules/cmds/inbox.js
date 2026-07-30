module.exports = {
	config: {
		name: "inbox",
		version: "1.0.0",
		author: "Jules",
		countDown: 5,
		role: 0,
		description: {
			vi: "Gửi tin nhắn trực tiếp đến hộp thư (inbox) của bạn.",
			en: "Sends a direct message to your inbox/DM."
		},
		category: "utility",
		guide: {
			vi: "   {pn} <tin nhắn>: Gửi tin nhắn đến hộp thư riêng của bạn (hỗ trợ E2EE).",
			en: "   {pn} <message>: Sends a message to your private inbox/DM (supports E2EE)."
		}
	},

	langs: {
		vi: {
			success: "✅ | Bot đã gửi một tin nhắn trực tiếp đến hộp thư của bạn! Vui lòng kiểm tra inbox (bao gồm cả tin nhắn chờ nếu chưa kết bạn).",
			error: "❌ | Không thể gửi tin nhắn trực tiếp đến bạn. Vui lòng đảm bảo rằng bạn đã cho phép nhận tin nhắn từ người lạ hoặc đã từng trò chuyện với bot.",
			noMessage: "Xin chào! Bạn vừa dùng lệnh inbox nhưng không nhập nội dung nào. Chúc bạn một ngày tốt lành!",
			incomingMessage: "📩 | Bạn có một tin nhắn từ group [ %1 ]:\n\n%2"
		},
		en: {
			success: "✅ | Bot has sent a direct message to your inbox! Please check your DMs (including message requests if we are not connected).",
			error: "❌ | Failed to send a direct message to you. Please ensure you have allowed messages from strangers or have conversed with the bot before.",
			noMessage: "Hello! You used the inbox command without specifying a message. Have a wonderful day!",
			incomingMessage: "📩 | You have a new message forwarded from group [ %1 ]:\n\n%2"
		}
	},

	onStart: async function ({ api, args, message, event, getLang, threadsData }) {
		const { senderID, threadID, isGroup } = event;
		const text = args.join(" ");

		// Get group name if applicable
		let groupName = "Unknown Group";
		if (isGroup) {
			try {
				const threadInfo = await threadsData.get(threadID);
				groupName = threadInfo.threadName || groupName;
			} catch (_) {}
		}

		let sendText = "";
		if (text) {
			sendText = isGroup ? getLang("incomingMessage", groupName, text) : text;
		} else {
			sendText = getLang("noMessage");
		}

		try {
			// Send message directly to senderID (which can be standard UID or E2EE JID)
			await api.sendMessage(sendText, senderID);

			// Reply back in the current thread to confirm
			return message.reply(getLang("success"));
		} catch (err) {
			console.error("Error in inbox command:", err);
			return message.reply(getLang("error"));
		}
	}
};

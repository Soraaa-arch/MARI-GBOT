module.exports = {
	config: {
		name: "adminonly",
		aliases: ["adonly", "onlyad", "onlyadmin"],
		version: "1.1",
		author: "rX",
		countDown: 5,
		role: 1,
		description: {
			en: "turn on/off the mode where only bot admins + group admins can use the bot in this group"
		},
		category: "box chat",
		guide: {
			en: "   {pn} [on | off]: turn on/off the mode only bot admin & group admin can use bot"
				+ "\n   {pn} status: show current status of this mode"
				+ "\n(non-admins will be silently ignored, no message sent, while this mode is on)"
		}
	},

	langs: {
		en: {
			turnedOn: "✅ Turned on the mode: only Bot Admins & Group Admins can use the bot in this group\n(other members' commands will be silently ignored)",
			turnedOff: "❌ Turned off the mode: only Bot Admins & Group Admins can use the bot in this group",
			alreadyOn: "⚠️ This mode is already turned on",
			alreadyOff: "⚠️ This mode is already turned off",
			status: "📌 Admin Only (Bot Admin + Group Admin) mode is currently: %1",
			syntaxError: "Syntax error, use {pn} on/off or {pn} status"
		}
	},

	onStart: async function ({ message, event, args, threadsData, getLang }) {
		const { threadID } = event;

		if (args[0] === "status" || !args[0]) {
			const adminOnly = await threadsData.get(threadID, "data.adminOnly", false);
			return message.reply(getLang("status", adminOnly ? "ON ✅" : "OFF ❌"));
		}

		if (!["on", "off"].includes(args[0]))
			return message.SyntaxError();

		const currentStatus = await threadsData.get(threadID, "data.adminOnly", false);
		const newStatus = args[0] === "on";

		if (currentStatus === newStatus)
			return message.reply(getLang(newStatus ? "alreadyOn" : "alreadyOff"));

		await threadsData.set(threadID, newStatus, "data.adminOnly");
		return message.reply(getLang(newStatus ? "turnedOn" : "turnedOff"));
	}
};

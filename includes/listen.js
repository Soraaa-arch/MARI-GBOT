/**
 *  GOATBOT V3
 *  CONTACT : rxabdullah617@gmail.com
 *  NOTES : THIS CODE MADE BY RX @RX_ABDULLAH007
 *  (GIVE CREDIT OTHERWISE EVERYONE FUCK YOU AT 300 KM SPEED)
 **/

const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handler/CheckData.js");

const getOnStartHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onStart.dev.js"
		: "./handler/onStart.js"
);
const getOnReactionHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onReaction.dev.js"
		: "./handler/onReaction.js"
);
const getOnReplyHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onReply.dev.js"
		: "./handler/onReply.js"
);
const getOnEventHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onEvent.dev.js"
		: "./handler/onEvent.js"
);

module.exports = (
	api,
	threadModel,
	userModel,
	dashBoardModel,
	globalModel,
	usersData,
	threadsData,
	dashBoardData,
	globalData
) => {
	const onStart = getOnStartHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onReaction = getOnReactionHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onReply = getOnReplyHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onEvent = getOnEventHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);

	return async function listener(event) {
		// ── E2EE system status messages ──────────────────────────────────────
		if (event.isE2EE) {
			const tag = "\x1b[1m\x1b[45m\x1b[37m 🔐 E2EE \x1b[0m ";
			if (event.type === "e2ee_fully_ready") {
				console.log(tag + "\x1b[32m✅  E2EE connected and ready\x1b[0m");
				return;
			}
			if (event.type === "e2ee_ready" || event.type === "e2ee_connected") {
				return; // silently skip — e2ee_fully_ready is the final signal
			}
			if (event.type === "e2ee_disconnected") {
				console.log(tag + "\x1b[33m⚠️   E2EE disconnected — attempting reconnect...\x1b[0m");
				return;
			}
		}
		// ── end E2EE status ───────────────────────────────────────────────────

		// Anti Inbox
		if (global.GoatBot.config?.antiInbox && !event.isGroup) return;

		const message = createFuncMessage(api, event);

		await handlerCheckDB(usersData, threadsData, event);

		const onStartObj = await onStart(event, message);
		const onReactionObj = await onReaction(event, message);
		const onReplyObj = await onReply(event, message);
		const onEventObj = await onEvent(event, message);

		const onStartFunc = onStartObj?.onStart;
		const onReactionFunc = onReactionObj?.onReaction;
		const onReplyFunc = onReplyObj?.onReply;

		const {
			onAnyEvent,
			onFirstChat,
			onChat,
			onEvent: onEventFunc,
			handlerEvent,
			typ,
			presence,
			read_receipt
		} = onEventObj || {};

		// Approval system
		if (global.GoatBot.config?.approval) {
			const approvedtid = await globalData.get("approved", "data", {});
			if (!Array.isArray(approvedtid.approved)) {
				approvedtid.approved = [];
				await globalData.set("approved", approvedtid, "data");
			}
			if (!approvedtid.approved.includes(event.threadID)) return;
		}

		onAnyEvent && onAnyEvent();

		switch (event.type) {
			case "message":
			case "message_reply":
			case "message_unsend":
			// ── E2EE (Facebook "Labyrinth" encrypted chats) ─────────────────────
			// The FCA e2ee bridge (includes/Fca/e2ee.js) normalizes incoming
			// encrypted-chat messages to the same shape as a normal "message"
			// event, but keeps a distinct `type` so callers can tell them apart:
			// "e2ee_message" for a fresh message, "message_reply" (shared with
			// the case above) when it's a reply. Since many/most 1-1 inbox
			// threads on Messenger are now E2EE by default, without this case
			// those DMs (and any E2EE group thread) never reached onChat/onStart/
			// onReply at all — commands and the inbox silently stopped working.
			case "e2ee_message":
				onFirstChat && onFirstChat();
				onChat && onChat();
				onStartFunc && onStartFunc();
				onReplyFunc && onReplyFunc();
				break;

			case "event":
				handlerEvent && handlerEvent();
				onEventFunc && onEventFunc();
				break;

			case "message_reaction":
			case "e2ee_message_reaction": {
				onReactionFunc && onReactionFunc();

				const botID = api.getCurrentUserID();
				const senderID = event.messageSenderID || event.senderID;
				const deleteEmojis = global.GoatBot.config?.reactBy?.delete || [];

				// ✅ ONLY: React → Unsend BOT message
				// For E2EE, prefer the definitive _e2eeBotSentMsgIds record (set when
				// the bot sends a message) over senderID, since senderID resolution
				// for E2EE reactions depends on a sender-JID map lookup that may miss.
				const isBotMessage = event.isE2EE
					? (global._e2eeBotSentMsgIds && global._e2eeBotSentMsgIds.has(String(event.messageID)))
					: senderID === botID;

				if (deleteEmojis.includes(event.reaction) && isBotMessage) {
					console.log(
						"🗑️ Unsend bot message triggered:",
						event.messageID
					);
					api.unsendMessage(event.messageID);
				}
				break;
			}

			case "typ":
				typ && typ();
				break;

			case "presence":
				presence && presence();
				break;

			case "read_receipt":
				read_receipt && read_receipt();
				break;

			default:
				break;
		}
	};
};

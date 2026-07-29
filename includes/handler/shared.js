// includes/handler/shared.js
// Common helpers + per-event context builder shared by onStart, onReply,
// onReaction and onEvent. Anything that was duplicated across those 4 files
// lives here now — each handler only keeps the logic that's actually unique
// to it (its own trigger condition + its own onXxx call).

const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];

function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
    const config = global.GoatBot.config;
    const adminBot = config.adminBot || [];
    const developer = config.developer || [];
    const vipuser = config.vipuser || [];

    if (!senderID) return 0;
    const adminBox = threadData ? threadData.adminIDs || [] : [];

    if (developer.includes(senderID)) return 4;
    if (adminBot.includes(senderID)) return 3;
    if (vipuser.includes(senderID)) return 2;
    if (adminBox.includes(senderID)) return 1;
    return 0;
}

function getBanText(type, reason, time, targetID, lang) {
    const utils = global.utils;
    if (type == "userBanned") return utils.getText({ lang, head: "handlerOnStart" }, "userBanned", reason, time, targetID);
    else if (type == "threadBanned") return utils.getText({ lang, head: "handlerOnStart" }, "threadBanned", reason, time, targetID);
    else if (type == "onlyAdminBox") return utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBox");
    else if (type == "onlyAdminBot") return utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
    return text
        .replace(/\{(?:p|prefix)\}/g, prefix)
        .replace(/\{(?:n|name)\}/g, commandName)
        .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
    let roleConfig;
    if (utils.isNumber(command.config.role)) {
        roleConfig = { onStart: command.config.role };
    } else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
        if (!command.config.role.onStart) command.config.role.onStart = 0;
        roleConfig = command.config.role;
    } else {
        roleConfig = { onStart: 0 };
    }

    if (isGroup) roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

    for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
        if (roleConfig[key] == undefined) roleConfig[key] = roleConfig.onStart;
    }

    return roleConfig;
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
    const config = global.GoatBot.config;
    const { adminBot, developer, vipuser, hideNotiMessage, developerOnly, vipOnly } = config;
    const role = getRole(threadData, senderID);

    const infoBannedUser = userData.banned;
    if (infoBannedUser.status == true) {
        const { reason, date } = infoBannedUser;
        if (hideNotiMessage.userBanned == false) message.reply(getBanText("userBanned", reason, date, senderID, lang));
        return true;
    }

    if (config.adminOnly.enable == true && !adminBot.includes(senderID) && !developer.includes(senderID) && !vipuser.includes(senderID) && !config.adminOnly.ignoreCommand.includes(commandName)) {
        if (hideNotiMessage.adminOnly == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBot", null, null, null, lang));
        return true;
    }

    if ((developerOnly?.enable == true) && role < 2 && !(developerOnly?.ignoreCommand || []).includes(commandName)) {
        if ((hideNotiMessage.developerOnly ?? false) == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyVipUserGlobal", null, null, null, lang));
        return true;
    }

    if ((vipOnly?.enable == true) && role < 2 && !(vipOnly?.ignoreCommand || []).includes(commandName)) {
        if ((hideNotiMessage.vipOnly ?? false) == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyVipUserGlobal", null, null, null, lang));
        return true;
    }

    if (isGroup == true) {
        if (threadData.data.onlyAdminBox === true && !threadData.adminIDs.includes(senderID) && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)) {
            if (!threadData.data.hideNotiMessageOnlyAdminBox) message.reply(getBanText("onlyAdminBox", null, null, null, lang));
            return true;
        }

        const infoBannedThread = threadData.banned;
        if (infoBannedThread.status == true) {
            const { reason, date } = infoBannedThread;
            if (hideNotiMessage.threadBanned == false) message.reply(getBanText("threadBanned", reason, date, threadID, lang));
            return true;
        }
    }
    return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
    const commandType = command.config.countDown ? "command" : "command event";
    const commandName = command.config.name;
    let customLang = {};
    if (fs.existsSync(pathCustomLang)) customLang = require(pathCustomLang)[commandName]?.text || {};

    return function (key, ...args) {
        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
        lang = replaceShortcutInLang(lang, prefix, commandName);
        for (let i = args.length - 1; i >= 0; i--) {
            lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
        }
        return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
    };
}

function removeCommandNameFromBody(body_, prefix_, commandName_) {
    if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x))) throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
    for (let i = 0; i < arguments.length; i++) if (typeof arguments[i] != "string") throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);
    return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
}

/**
 * Builds everything that onStart / onReply / onReaction / onEvent all need
 * before they can run their own specific logic: loads/creates thread & user
 * data, resolves prefix/role/lang, and prepares the shared `parameters`
 * object passed into every command lifecycle method.
 *
 * Returns null when the event should simply be ignored (no threadID, or the
 * thread is stuck failing to create).
 */
async function buildContext({ api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData, event, message }) {
    const { utils, client, GoatBot } = global;
    const { getPrefix, removeHomeDir, log, getTime } = utils;
    const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
    const { autoRefreshThreadInfoFirstTime } = config.database;
    let { hideNotiMessage = {} } = config;

    const { body, messageID, threadID, isGroup } = event;

    if (!threadID) return null;

    const senderID = event.userID || event.senderID || event.author;

    let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
    let userData = global.db.allUserData.find(u => u.userID == senderID);

    if (!userData && !isNaN(senderID)) userData = await usersData.create(senderID);

    if (!threadData && !isNaN(threadID)) {
        if (global.temp.createThreadDataError.includes(threadID)) return null;
        threadData = await threadsData.create(threadID);
        global.db.receivedTheFirstMessage[threadID] = true;
    } else {
        if (autoRefreshThreadInfoFirstTime === true && !global.db.receivedTheFirstMessage[threadID]) {
            global.db.receivedTheFirstMessage[threadID] = true;
            await threadsData.refreshInfo(threadID);
        }
    }

    if (typeof threadData.settings.hideNotiMessage == "object") hideNotiMessage = threadData.settings.hideNotiMessage;

    const prefix = getPrefix(threadID);
    const role = getRole(threadData, senderID);
    const parameters = {
        api, usersData, threadsData, message, event,
        userModel, threadModel, prefix, dashBoardModel,
        globalModel, dashBoardData, globalData, envCommands,
        envEvents, envGlobal, role,
        removeCommandNameFromBody
    };
    const langCode = threadData.data.lang || config.language || "en";

    function createMessageSyntaxError(commandName) {
        message.SyntaxError = async function () {
            return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "commandSyntaxError", prefix, commandName));
        };
    }

    return {
        utils, client, GoatBot, getPrefix, removeHomeDir, log, getTime,
        config, envGlobal, envCommands, envEvents,
        body, messageID, threadID, isGroup, senderID,
        threadData, userData, hideNotiMessage, prefix, role,
        parameters, langCode, createMessageSyntaxError
    };
}

module.exports = {
    nullAndUndefined,
    getType,
    getRole,
    getBanText,
    replaceShortcutInLang,
    getRoleConfig,
    isBannedOrOnlyAdmin,
    createGetText2,
    removeCommandNameFromBody,
    buildContext
};

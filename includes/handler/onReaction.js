// onReaction.js
const { getRoleConfig, isBannedOrOnlyAdmin, createGetText2, buildContext } = require("./shared");

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
    return async function (event, message) {
        const ctx = await buildContext({ api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData, event, message });
        if (!ctx) return;
        const {
            utils, log, removeHomeDir, getTime,
            threadData, userData, hideNotiMessage, prefix, role,
            parameters, langCode, createMessageSyntaxError,
            senderID, threadID, isGroup, messageID
        } = ctx;
        const { GoatBot } = global;

        // <<< --- onReaction LOGIC --- >>>
        const { onReaction } = GoatBot;
        const Reaction = onReaction.get(String(messageID));
        if (!Reaction) return;
        Reaction.delete = () => onReaction.delete(String(messageID));
        const commandName = Reaction.commandName;
        if (!commandName) {
            message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "cannotFindCommandName"));
            return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
        }
        const command = GoatBot.commands.get(commandName);
        if (!command) {
            message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "cannotFindCommand", commandName));
            return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
        }
        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
        const needRole = roleConfig.onReaction;
        if (needRole > role) {
            if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
                if (needRole == 1) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyAdminToUseOnReaction", commandName));
                else if (needRole == 2) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyAdminBot2ToUseOnReaction", commandName));
                else if (needRole == 3) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyVipUserToUseOnReaction", commandName));
                else if (needRole == 4) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyDeveloperToUseOnReaction", commandName));
            } else return true;
        }
        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        try {
            if (!command) throw new Error(`Cannot find command with commandName: ${commandName}`);
            const args = [];
            createMessageSyntaxError(commandName);
            if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode)) return;
            await command.onReaction({ ...parameters, Reaction, args, commandName, getLang: getText2 });
            log.info("onReaction", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${event.reaction}`);
        } catch (err) {
            log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
            await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
        }
    };
};

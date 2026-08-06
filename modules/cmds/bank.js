const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

module.exports = {
    config: {
        name: "bank",
        version: "2.5-sovereign",
        author: "Minh Anh",
        role: 0,
        shortDescription: "Sovereign Private Banking System",
        longDescription: "Sovereign-themed private banking system with custom metallic card canvas generator and elite card tiers.",
        category: "finance",
        guide: `{pn} - View bank menu
{pn} register - Open Sovereign Vault
{pn} balance - Check balance  
{pn} deposit <amount> - Deposit funds
{pn} withdraw <amount> - Withdraw funds
{pn} history - Transaction log
{pn} card [theme] - View ATM card (Themes: sovereign, black, gold, obsidian, emerald, ocean, sunset)
{pn} send <target> <amount> - Transfer funds
{pn} account - Portfolio overview`
    },

    formatMoney(amount) {
        if (isNaN(amount)) return "0";
        amount = Number(amount);
        const scales = [
            { value: 1e15, suffix: 'Q' },
            { value: 1e12, suffix: 'T' },
            { value: 1e9, suffix: 'B' },
            { value: 1e6, suffix: 'M' },
            { value: 1e3, suffix: 'k' }
        ];
        for (let scale of scales) {
            if (amount >= scale.value) {
                let val = amount / scale.value;
                return val % 1 === 0 ? `${val}${scale.suffix}` : `${val.toFixed(2)}${scale.suffix}`;
            }
        }
        return amount.toString();
    },

    generateCardNumber() {
        return "4921 " +
            Math.floor(1000 + Math.random() * 9000) + " " +
            Math.floor(1000 + Math.random() * 9000) + " " +
            Math.floor(1000 + Math.random() * 9000);
    },

    generateCVV() { return Math.floor(100 + Math.random() * 900).toString(); },
    generatePIN() { return Math.floor(1000 + Math.random() * 9000).toString(); },
    getExpiry() {
        const now = new Date();
        return `${now.getMonth() + 1}/${(now.getFullYear() + 5).toString().slice(-2)}`;
    },

    nowISO() {
        return new Date().toISOString();
    },

    cardDesigns: {
        default: {
            gradient: ["#0f0c1b", "#1a162b", "#090710"],
            chipColor: "#d4af37",
            hologramColors: ["#d4af37", "#aa7c11"],
            accentColor: "#f3e5ab"
        },
        sovereign: {
            gradient: ["#140029", "#240046", "#0c0018"],
            chipColor: "#ffbf00",
            hologramColors: ["#ffd700", "#e65c00"],
            accentColor: "#ffd700"
        },
        black: {
            gradient: ["#181818", "#080808", "#000000"],
            chipColor: "#e0e0e0",
            hologramColors: ["#ffffff", "#444444"],
            accentColor: "#ffffff"
        },
        gold: {
            gradient: ["#4a3b00", "#8c7000", "#c59b27"],
            chipColor: "#ffffff",
            hologramColors: ["#ffe066", "#d4af37"],
            accentColor: "#ffffff"
        },
        obsidian: {
            gradient: ["#0b0c10", "#1f2833", "#050608"],
            chipColor: "#66fcf1",
            hologramColors: ["#45a29e", "#66fcf1"],
            accentColor: "#66fcf1"
        },
        emerald: {
            gradient: ["#021b14", "#0b3c2f", "#01120d"],
            chipColor: "#ffd700",
            hologramColors: ["#50c878", "#a3e4d7"],
            accentColor: "#e8f8f5"
        },
        ocean: {
            gradient: ["#004e92", "#000428", "#002f4b"],
            chipColor: "#b5c99a",
            hologramColors: ["#1ca3ec", "#50c9ce"],
            accentColor: "#ffffff"
        },
        sunset: {
            gradient: ["#ff512f", "#f09819", "#ff7e5f"],
            chipColor: "#ffd700",
            hologramColors: ["#ff4500", "#ff6347"],
            accentColor: "#ffffff"
        }
    },

    async createRealCard(card, username, balance, transactions = [], design = "sovereign") {
        const width = 900, height = 540;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const d = this.cardDesigns[design] || this.cardDesigns.sovereign;

        // Background Gradient
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, d.gradient[0]);
        bg.addColorStop(0.5, d.gradient[1]);
        bg.addColorStop(1, d.gradient[2]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Sovereign Metallic Border Pattern
        ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
        ctx.lineWidth = 4;
        ctx.strokeRect(15, 15, width - 30, height - 30);

        // Header Title
        ctx.font = "bold 44px Georgia, serif";
        ctx.fillStyle = d.accentColor;
        ctx.fillText("SOVEREIGN PRIVATE BANK", 40, 80);

        // EMV Chip
        ctx.fillStyle = d.chipColor;
        ctx.fillRect(40, 160, 120, 80);
        ctx.strokeStyle = "#8d7d47";
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 160, 120, 80);

        ctx.strokeStyle = "#4a3f1c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 190); ctx.lineTo(160, 190);
        ctx.moveTo(40, 210); ctx.lineTo(160, 210);
        ctx.stroke();

        // Card Number
        ctx.font = "42px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 10;
        ctx.fillText(card.number, 40, 340);
        ctx.shadowBlur = 0;

        // Card Holder
        ctx.font = "bold 34px sans-serif";
        ctx.fillStyle = d.accentColor;
        ctx.fillText(username.toUpperCase(), 40, 430);

        // Expiry
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText("VALID THRU", 600, 300);
        ctx.font = "40px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(card.expiry, 600, 350);

        // CVV Indicator
        ctx.font = "26px sans-serif";
        ctx.fillStyle = "#dddddd";
        ctx.fillText("CVV: *** (Hidden)", 600, 430);

        // Balance Display
        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = d.accentColor;
        ctx.textAlign = "right";
        ctx.fillText(`Vault: ${this.formatMoney(balance)} BDT`, 860, 470);

        // Last Transaction
        if (transactions.length) {
            const lastTx = transactions[transactions.length - 1];
            const typeSymbol = lastTx.type === "sent" ? "➡️" : "⬅️";
            const amountText = `${this.formatMoney(lastTx.amount)} BDT`;
            const info = `${typeSymbol} ${amountText} ${lastTx.type === "sent" ? "Sent" : "Received"}`;
            ctx.font = "26px sans-serif";
            ctx.fillStyle = "#ffd700";
            ctx.textAlign = "left";
            ctx.fillText(info, 40, 470);
        }

        // Hologram Symbol
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = d.hologramColors[0];
        ctx.beginPath(); ctx.arc(750, 140, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = d.hologramColors[1];
        ctx.beginPath(); ctx.arc(790, 140, 35, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        const outputDir = path.join(__dirname, "cache");
        fs.mkdirSync(outputDir, { recursive: true });
        const filePath = path.join(outputDir, `${Date.now()}_sovereign_card.png`);
        fs.writeFileSync(filePath, canvas.toBuffer());
        return filePath;
    },

    async onStart({ message, args, usersData, event }) {
        const uid = event.senderID;
        const action = args[0]?.toLowerCase();
        let data = await usersData.get(uid);
        if (!data.data) data.data = {};
        if (!data.data.bank)
            data.data.bank = {
                balance: 0,
                registered: false,
                card: null,
                transactions: [],
                accountNumber: `SV-${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
                createdAt: null,
                savings: 0
            };
        const bank = data.data.bank;

        if (action === "register") {
            if (bank.registered) return message.reply("⚠️ You already hold an active Sovereign Vault account.");
            bank.registered = true;
            bank.balance = 0;
            bank.createdAt = this.nowISO();
            await usersData.set(uid, { data: data.data });

            return message.reply(
`👑 SOVEREIGN PRIVATE BANK
🏛️ Vault Opening Successful
📈 Account No: ${bank.accountNumber}
📅 Date Joined: ${bank.createdAt}`
            );
        }

        if (!bank.registered)
            return message.reply("❌ You do not have an active Sovereign Vault account.\nUse: \`bank register\`");

        if (action === "balance") {
            return message.reply(`⚜️ Sovereign Vault Balance: **${this.formatMoney(bank.balance)} BDT**`);
        }

        if (action === "card") {
            if (!bank.card) {
                bank.card = {
                    number: this.generateCardNumber(),
                    cvv: this.generateCVV(),
                    pin: this.generatePIN(),
                    expiry: this.getExpiry(),
                };
                await usersData.set(uid, { data: data.data });
            }
            const chosenDesign = args[1]?.toLowerCase() || "sovereign";
            const image = await this.createRealCard(bank.card, data.name || "User", bank.balance, bank.transactions, chosenDesign);
            return message.reply({
                body:
                    "💳 **SOVEREIGN PRIVATE CARD**\n" +
                    "━━━━━━━━━━━━━━━━━\n" +
                    `👑 Theme: ${chosenDesign.toUpperCase()}\n` +
                    `💳 Card No: ${bank.card.number}\n` +
                    `📅 Expiry: ${bank.card.expiry}\n` +
                    `🔑 PIN: ${bank.card.pin}\n` +
                    `🔒 CVV: (Protected)\n` +
                    `⚜️ Balance: ${this.formatMoney(bank.balance)} BDT`,
                attachment: fs.createReadStream(image),
            });
        }

        if (action === "deposit") {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter a valid deposit amount.");
            bank.balance += amount;
            bank.transactions.push({ type: "received", amount, from: "Deposit", time: Date.now() });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ Deposited **${this.formatMoney(amount)} BDT** into Sovereign Vault.\n⚜️ New Balance: **${this.formatMoney(bank.balance)} BDT**`);
        }

        if (action === "withdraw") {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter a valid withdrawal amount.");
            if (amount > bank.balance) return message.reply("❌ Insufficient vault balance.");
            bank.balance -= amount;
            bank.transactions.push({ type: "sent", amount, to: "Withdrawal", time: Date.now() });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ Withdrew **${this.formatMoney(amount)} BDT** from Sovereign Vault.\n⚜️ Remaining Balance: **${this.formatMoney(bank.balance)} BDT**`);
        }

        if (action === "send") {
            const target = args[1];
            const amount = parseFloat(args[2]);
            if (!target) return message.reply("❌ Please specify recipient ID.");
            if (isNaN(amount) || amount <= 0) return message.reply("❌ Enter valid amount.");
            if (amount > bank.balance) return message.reply("❌ Insufficient vault balance.");
            let targetData = await usersData.get(target);
            if (!targetData.data) targetData.data = {};
            if (!targetData.data.bank) targetData.data.bank = { balance: 0, registered: false, card: null, transactions: [] };
            if (!targetData.data.bank.registered) return message.reply("❌ Recipient does not hold a Sovereign account.");
            bank.balance -= amount;
            targetData.data.bank.balance += amount;
            bank.transactions.push({ type: "sent", amount, to: targetData.name || "User", time: Date.now() });
            targetData.data.bank.transactions.push({ type: "received", amount, from: data.name || "User", time: Date.now() });
            await usersData.set(uid, { data: data.data });
            await usersData.set(target, { data: targetData.data });
            return message.reply(`✅ Transferred **${this.formatMoney(amount)} BDT** to ${targetData.name || "User"}.\n⚜️ Remaining Balance: **${this.formatMoney(bank.balance)} BDT**`);
        }

        if (action === "history") {
            let historyText = "📜 SOVEREIGN TRANSACTION AUDIT\n━━━━━━━━━━━━━━━━━\n";
            if (!bank.transactions.length) {
                historyText += "1. 📥 RECEIVED\n   +$0 | Invalid Date\n   ID: undefined\n";
            } else {
                bank.transactions.slice(-10).reverse().forEach((tx, i) => {
                    const date = tx.time ? new Date(tx.time).toLocaleString() : "Invalid Date";
                    if (tx.type === "received") {
                        historyText += `${i + 1}. 📥 RECEIVED\n   +${this.formatMoney(tx.amount)} BDT | ${date}\n   Source: ${tx.from || "Vault"}\n`;
                    } else if (tx.type === "sent") {
                        historyText += `${i + 1}. 📤 TRANSFERRED\n   -${this.formatMoney(tx.amount)} BDT | ${date}\n   Destination: ${tx.to || "Vault"}\n`;
                    }
                });
            }
            return message.reply(historyText);
        }

        if (action === "account") {
            return message.reply(
`👑 SOVEREIGN PRIVATE PORTFOLIO

🏛️ Sovereign Global Reserve
━━━━━━━━━━━━━━━━━
👤 Holder: ${data.name || "User"}
📈 Account: ${bank.accountNumber}
💴 Vault Balance: ${this.formatMoney(bank.balance)} BDT
💎 Reserve Savings: ${this.formatMoney(bank.savings || 0)} BDT
━━━━━━━━━━━━━━━━━`
            );
        }

        return message.reply("❌ Invalid command action.\nUse: bank register | balance | card [theme] | deposit | withdraw | send | history | account");
    }
};

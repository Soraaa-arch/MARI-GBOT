module.exports = {
        config: {
                name: "daily",
                aliases: ["dailyreward"],
                version: "2.0",
                author: "Replit Agent",
                countDown: 5,
                role: 0,
                description: {
                        en: "Claim your daily login reward with streak bonuses!"
                },
                category: "economy",
                guide: {
                        en: "   {pn} - Claim daily reward\n   {pn} stats - View your streak"
                }
        },

        langs: {
                en: {
                        claimed: "🎁 DAILY REWARD CLAIMED!\n\n━━━━━━━━━━━━━━━━━━━━\n✨ Base Reward: 80 coins\n🔥 Streak Tier Bonus: x%1\n💰 Total Earned: %2 coins\n━━━━━━━━━━━━━━━━━━━━\n\n📅 Current Streak: %3 days\n⏳ Bonus tier increases every 5 days!\n\n✅ Keep claiming!",
                        already_claimed: "❌ You already claimed today!\n\n⏰ Next claim in: %1 hours\n🔥 Streak: %2 days",
                        stats: "📊 YOUR DAILY STATS\n\n━━━━━━━━━━━━━━━━━━━\n🔥 Current Streak: %1 days\n💰 Total Coins Earned: %2\n📅 Last Claimed: %3\n⏳ Bonus Tier: %4x\n━━━━━━━━━━━━━━━━━━━"
                }
        },

        onStart: async function ({ message, args, getLang, event, usersData }) {
                const userID = event.senderID;
                
                let dailyData = await usersData.get(userID, "data.daily");
                if (!dailyData) {
                        dailyData = { lastClaimDate: null, streak: 0, totalEarned: 0 };
                }

                if (args[0]?.toLowerCase() === "stats") {
                        const lastDate = dailyData.lastClaimDate ? new Date(dailyData.lastClaimDate).toLocaleDateString() : "Never";
                        const tier = 1.0 + Math.floor(dailyData.streak / 5) * 0.2;
                        return message.reply(getLang("stats", dailyData.streak, dailyData.totalEarned, lastDate, tier.toFixed(1)));
                }

                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                if (dailyData.lastClaimDate) {
                        const lastClaimDate = new Date(dailyData.lastClaimDate);
                        const lastClaim = new Date(lastClaimDate.getFullYear(), lastClaimDate.getMonth(), lastClaimDate.getDate());
                        
                        if (lastClaim.getTime() === today.getTime()) {
                                const hoursLeft = Math.ceil((new Date(today.getTime() + 24*60*60*1000) - now) / (1000*60*60));
                                return message.reply(getLang("already_claimed", hoursLeft, dailyData.streak));
                        } else if (lastClaim.getTime() === new Date(today.getTime() - 24*60*60*1000).getTime()) {
                                dailyData.streak += 1;
                        } else {
                                dailyData.streak = 1;
                        }
                } else {
                        dailyData.streak = 1;
                }

                const baseReward = 80;
                const tierBonus = 1.0 + Math.floor(dailyData.streak / 5) * 0.2;
                const totalReward = Math.floor(baseReward * tierBonus);

                let userData = await usersData.get(userID, "data.economy");
                if (!userData) userData = { wallet: 0, bank: 0 };
                userData.wallet = (userData.wallet || 0) + totalReward;
                await usersData.set(userID, userData, "data.economy");

                dailyData.lastClaimDate = today;
                dailyData.totalEarned = (dailyData.totalEarned || 0) + totalReward;
                await usersData.set(userID, dailyData, "data.daily");

                return message.reply(getLang("claimed", tierBonus.toFixed(1), totalReward, dailyData.streak));
        }
};

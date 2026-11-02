const { Events } = require("discord.js");

const MIN_PLAYERS = 5;
const EARLY_START_NOTICE_MS = 60_000;
const MAX_WAITING_SHOWN = 20;

function findJoinEmoji(guild) {
    return guild.emojis.cache.find((emoji) => emoji.name === "green_tick") ?? "✅";
}

function renderSignup({ script, max, emoji, queue, closed }) {
    const players = queue.slice(0, max);
    const waiting = queue.slice(max);
    const header = closed
        ? `Signup for ${script} is closed.`
        : `A Storyteller is hosting ${script}, places are first come first serve. React with ${emoji} to join`;
    const lines = [header, "", `**Players (${players.length}/${max}):**`];
    players.forEach((id, i) => lines.push(`${i + 1}. <@${id}>`));
    if (waiting.length > 0) {
        lines.push("", "**Waiting list:**");
        waiting.slice(0, MAX_WAITING_SHOWN).forEach((id, i) => lines.push(`${i + 1}. <@${id}>`));
        if (waiting.length > MAX_WAITING_SHOWN) {
            lines.push(`...and ${waiting.length - MAX_WAITING_SHOWN} more`);
        }
    }
    return lines.join("\n");
}

// Posts the signup message and tracks reactions in the order they were made. Anyone past the
// player limit sits on a waiting list and is promoted if someone leaves.
// The storyteller can reply "start" to begin early or "cancel" in their DMs.
// Resolves to { reason: "full" | "start" | "cancel", players: [userId, ...] }
async function runSignup({ channel, storyteller, script, max }) {
    const client = channel.client;
    const emoji = findJoinEmoji(channel.guild);
    const emojiKey = emoji.toString();
    const queue = [];
    const state = () => ({ script, max, emoji, queue });
    const options = (content) => ({ content, allowedMentions: { parse: [] } });

    const message = await channel.send(options(renderSignup(state())));
    await message.react(emoji);

    let edits = Promise.resolve();
    const refresh = (closed = false) => {
        edits = edits
            .then(() => message.edit(options(renderSignup({ ...state(), closed }))))
            .catch((error) => console.error("Failed to update signup message:", error));
        return edits;
    };

    const isJoinReaction = (reaction, user) =>
        reaction.message.id === message.id && !user.bot && reaction.emoji.toString() === emojiKey;

    const dm = await storyteller.createDM();
    const dmCollector = dm.createMessageCollector({ filter: (m) => m.author.id === storyteller.id });
    let noticeTimer;

    return new Promise((resolve) => {
        let finished = false;
        let fullNotified = false;
        const finish = async (reason) => {
            if (finished) return;
            finished = true;
            client.off(Events.MessageReactionAdd, onAdd);
            client.off(Events.MessageReactionRemove, onRemove);
            dmCollector.stop();
            clearTimeout(noticeTimer);
            await refresh(true);
            resolve({ reason, players: queue.slice(0, max) });
        };

        const onAdd = async (reaction, user) => {
            if (!isJoinReaction(reaction, user) || queue.includes(user.id)) return;
            queue.push(user.id);
            const justFilled = queue.length >= max && !fullNotified;
            fullNotified = fullNotified || justFilled;
            await refresh();
            if (justFilled) {
                await storyteller.send(`The game is full with ${max} players.`);
                await finish("full");
            }
        };

        const onRemove = async (reaction, user) => {
            if (!isJoinReaction(reaction, user)) return;
            const index = queue.indexOf(user.id);
            if (index !== -1) {
                queue.splice(index, 1);
                await refresh();
            }
        };

        client.on(Events.MessageReactionAdd, onAdd);
        client.on(Events.MessageReactionRemove, onRemove);

        noticeTimer = setTimeout(() => {
            storyteller
                .send(
                    `The game isn't full yet (${Math.min(queue.length, max)}/${max} players). ` +
                    `Reply "start" to begin with the current players (at least ${MIN_PLAYERS} needed) or "cancel" to stop.`
                )
                .catch(console.error);
        }, EARLY_START_NOTICE_MS);

        dmCollector.on("collect", async (reply) => {
            const text = reply.content.trim().toLowerCase();
            if (text === "cancel") {
                await finish("cancel");
            } else if (text === "start") {
                if (queue.length < MIN_PLAYERS) {
                    await storyteller.send(`At least ${MIN_PLAYERS} players are needed to start. There are ${queue.length} so far.`);
                } else {
                    await finish("start");
                }
            }
        });
    });
}

module.exports = { runSignup, MIN_PLAYERS };

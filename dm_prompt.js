// Asks a user a question over DM and keeps asking until parse() accepts the reply.
// parse(text) must return { value } when valid or { error } with a message to send back.
// Resolves to the parsed value, or null if the user does not reply in time.
async function ask(user, prompt, parse, timeMs = 300_000) {
    const dm = await user.send(prompt);
    while (true) {
        const collected = await dm.channel.awaitMessages({
            filter: (m) => m.author.id === user.id,
            max: 1,
            time: timeMs,
        });
        const reply = collected.first();
        if (!reply) {
            await user.send("Timed out waiting for your reply. Run !start again when you are ready.");
            return null;
        }
        const result = parse(reply.content.trim());
        if (!("error" in result)) {
            return result.value;
        }
        await user.send(result.error);
    }
}

module.exports = { ask };

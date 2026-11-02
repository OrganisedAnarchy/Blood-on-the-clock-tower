//runs the questions for the game setup to the storyteller

const { Events } = require("discord.js");
const { ask } = require("./dm_prompt");
const { playerCounts } = require("./core_rules");
const { runSignup, MIN_PLAYERS } = require("./signup");
const { chooseRoles, formatRoles } = require("./role_selection");

const SCRIPTS = ["Trouble Brewing", "Bad Moon Rising", "Sects & Violets"];
const SIGNUP_CHANNEL = "game-signup";
const MAX_PLAYERS = Math.max(...Object.keys(playerCounts).map(Number));

const SCRIPT_PROMPT =
    "What script would you like to run? Reply with a number from 1-4:\n" +
    "1. Trouble Brewing\n" +
    "2. Bad Moon Rising\n" +
    "3. Sects & Violets\n" +
    "4. Custom (Custom scripts are coming soon)";

// Storytellers who are currently in the middle of a setup
const activeSetups = new Set();

function parseScript(text) {
    if (/^[1-3]$/.test(text)) return { value: SCRIPTS[Number(text) - 1] };
    if (text === "4") return { error: "Custom scripts are coming soon. Please choose a number from 1-3." };
    return { error: "Invalid choice. Please reply with a number from 1-4." };
}

function parseMaxPlayers(text) {
    const number = Number(text);
    if (/^\d+$/.test(text) && number >= MIN_PLAYERS && number <= MAX_PLAYERS) return { value: number };
    return { error: `Please reply with a number from ${MIN_PLAYERS}-${MAX_PLAYERS}.` };
}

async function runGameSetup(message, signupChannel) {
    const storyteller = message.author;

    await message.reply("check your DMs for the game setup.");
    await storyteller.send("Welcome to the game setup! Please answer the following questions to configure the game.");

    const script = await ask(storyteller, SCRIPT_PROMPT, parseScript);
    if (!script) return;
    await storyteller.send(`You chose ${script}.`);

    const max = await ask(storyteller, `What is the maximum number of players for ${script}? (${MIN_PLAYERS}-${MAX_PLAYERS})`, parseMaxPlayers);
    if (!max) return;

    await storyteller.send(`Signup is now open in #${SIGNUP_CHANNEL}. I'll let you know when it's full, or you can reply "start" at any time to begin early.`);
    const signup = await runSignup({ channel: signupChannel, storyteller, script, max });
    if (signup.reason === "cancel") {
        await storyteller.send("Signup cancelled.");
        return;
    }

    const counts = playerCounts[signup.players.length];
    await storyteller.send(`Signup is closed with ${signup.players.length} players.`);
    const roles = await chooseRoles(storyteller, script, counts);
    if (!roles) return;

    await storyteller.send(`Roles for ${script} with ${signup.players.length} players:\n${formatRoles(roles)}`);
    return { script, players: signup.players, roles };
}

// The client passed in must have the Guilds, GuildMessages, MessageContent, DirectMessages and
// GuildMessageReactions intents and the Channel, Message, Reaction and User partials
function registerStartGame(client, commandRoot = "!") {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;
        if (message.content.trim().split(/\s+/)[0].toLowerCase() !== `${commandRoot}start`) return;

        if (!message.member || !message.member.roles.cache.some(role => role.name === "Storyteller")) {
            await message.reply("You do not have permission to start the game setup. If you would like to become a storyteller, please put a request in #storyteller-requests");
            return;
        }
        const signupChannel = message.guild.channels.cache.find(c => c.name === SIGNUP_CHANNEL && c.isTextBased());
        if (!signupChannel) {
            await message.reply(`I can't find a #${SIGNUP_CHANNEL} channel to post the signup in.`);
            return;
        }
        if (activeSetups.has(message.author.id)) {
            await message.reply("You already have a game setup in progress.");
            return;
        }

        activeSetups.add(message.author.id);
        try {
            await runGameSetup(message, signupChannel);
        } catch (error) {
            console.error("Game setup failed:", error);
            await message.reply(`Something went wrong with the game setup. Make sure I can DM you and post in #${SIGNUP_CHANNEL}.`).catch(() => {});
        } finally {
            activeSetups.delete(message.author.id);
        }
    });
}

module.exports = { registerStartGame };

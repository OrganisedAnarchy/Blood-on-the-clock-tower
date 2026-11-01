const {
  Client,
  Events,
  GatewayIntentBits,
  OAuth2Scopes,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

process.loadEnvFile(".env");

const { DISCORD_TOKEN, PERMISSION } = process.env;
if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!/^\d+$/.test(PERMISSION ?? "")) {
  console.error("PERMISSION in .env must be an integer.");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check that the bot is alive"),
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag} (id: ${c.user.id})`);
  console.log(
    "Invite URL:",
    c.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: BigInt(PERMISSION),
    })
  );
  const rest = new REST().setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(c.user.id), {
    body: commands.map((cmd) => cmd.toJSON()),
  });
  console.log("Slash commands registered.");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }
});

client.login(DISCORD_TOKEN);

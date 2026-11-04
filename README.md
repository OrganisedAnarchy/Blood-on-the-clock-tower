# Blood on the Clocktower Discord Bot

An in-progress Discord.js bot that helps storytellers set up a Blood on the Clocktower game, collect sign-ups, and choose roles.

## Current features

- Storyteller-only `!start` command launches a guided setup in DMs.
- Supports Trouble Brewing, Bad Moon Rising, and Sects & Violets.
- Opens sign-ups in a `#game-signup` channel and lets the storyteller start early.
- Selects roles randomly or lets the storyteller choose them for the player count.
- Provides a `/ping` slash command to check that the bot is online.

Custom scripts are not implemented yet.

## Requirements

- Node.js 20.12 or newer
- A Discord application and bot token
- A server with a `Storyteller` role and a `game-signup` text channel

## Run locally

1. Clone this repository and install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env`, then set `DISCORD_TOKEN` and the bot permission integer from the Discord Developer Portal.
3. Enable the Message Content Intent for the bot in the Discord Developer Portal. Invite the bot with the required server/channel access and permission value.
4. Start the bot:

   ```sh
   npm start
   ```

The storyteller must be able to receive direct messages from the bot. Keep `.env` private; never commit your bot token.

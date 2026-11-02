const { ask } = require("./dm_prompt");
const { getRoles } = require("./role_registry");

// Order the storyteller is asked about teams when choosing custom roles
const TEAM_ORDER = ["demons", "minions", "outsiders", "townsfolk"];

function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function pickRandom(script, counts) {
    const roles = {};
    for (const team of TEAM_ORDER) {
        roles[team] = shuffle(getRoles(script, team))
            .slice(0, counts[team])
            .map((role) => role.name);
    }
    return roles;
}

// Returns the chosen roles per team, or null if the storyteller stops replying
async function pickCustom(storyteller, script, counts) {
    const roles = {};
    for (const team of TEAM_ORDER) {
        const need = counts[team];
        const pool = getRoles(script, team);
        if (need === 0) {
            roles[team] = [];
            continue;
        }
        // Nothing to choose when the script only has as many roles as are needed (e.g. the Imp in Trouble Brewing)
        if (pool.length <= need) {
            roles[team] = pool.map((role) => role.name);
            await storyteller.send(`${script} has no choice of ${team}, so they have been set automatically: ${roles[team].join(", ")}.`);
            continue;
        }
        const options = pool.map((role, i) => `${i + 1}. ${role.name}`).join("\n");
        const prompt =
            `Choose ${need} ${team} for ${script}. Reply with ${need} number(s) separated by commas:\n${options}`;
        const chosen = await ask(storyteller, prompt, (text) => {
            const picks = text.split(/[\s,]+/).filter(Boolean).map(Number);
            const valid = picks.every((n) => Number.isInteger(n) && n >= 1 && n <= pool.length);
            if (!valid || new Set(picks).size !== picks.length || picks.length !== need) {
                return { error: `Please reply with exactly ${need} different number(s) from 1-${pool.length}, separated by commas.` };
            }
            return { value: picks.map((n) => pool[n - 1].name) };
        });
        if (!chosen) return null;
        roles[team] = chosen;
    }
    return roles;
}

function formatRoles(roles) {
    return TEAM_ORDER.map((team) => `**${team[0].toUpperCase()}${team.slice(1)}:** ${roles[team].join(", ") || "none"}`).join("\n");
}

// Asks the storyteller how to pick roles, then returns { demons, minions, outsiders, townsfolk } or null
async function chooseRoles(storyteller, script, counts) {
    const mode = await ask(
        storyteller,
        "Would you like to choose the roles yourself or have them chosen randomly? Reply with a number:\n1. Random\n2. Custom",
        (text) => (text === "1" || text === "2" ? { value: text } : { error: "Please reply with 1 or 2." })
    );
    if (!mode) return null;
    return mode === "1" ? pickRandom(script, counts) : pickCustom(storyteller, script, counts);
}

module.exports = { chooseRoles, formatRoles };

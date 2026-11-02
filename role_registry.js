const fs = require("fs");
const path = require("path");

const rolesDir = path.join(__dirname, "roles");

const allRoles = fs
    .readdirSync(rolesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
        fs
            .readdirSync(path.join(rolesDir, dir.name))
            .filter((file) => file.endsWith(".js"))
            .map((file) => require(path.join(rolesDir, dir.name, file)))
    );

// team is lowercase to match the keys in core_rules.js: demons, minions, outsiders, townsfolk
function getRoles(script, team) {
    return allRoles.filter((role) => role.scripts.includes(script) && role.team.toLowerCase() === team);
}

module.exports = { getRoles };

const TeamData = {
    fields: [
        { label: "Team pace", stat: ["team_pace"], potential: ["chassis_starting_potential", "team_pace"] },
        { label: "Braking", stat: ["braking"], potential: ["chassis_starting_potential", "braking"] },
        { label: "Acceleration", stat: ["acceleration"], potential: ["chassis_starting_potential", "acceleration"] },
        { label: "Slow corners", stat: ["attr", "slow"], potential: ["chassis_starting_potential", "slow"] },
        { label: "Medium corners", stat: ["attr", "med"], potential: ["chassis_starting_potential", "med"] },
        { label: "High-speed corners", stat: ["attr", "high"], potential: ["chassis_starting_potential", "high"] },
        { label: "Straight-line", stat: ["attr", "straight"], potential: ["chassis_starting_potential", "straight"] },
        { label: "Tyre management", stat: ["tyre_management"], potential: ["chassis_starting_potential", "tyre_management"] },
        { label: "Chassis reliability", stat: ["chassis_reliability"], potential: ["chassis_starting_potential", "chassis_reliability"] },
        { label: "Dirty-air sensitivity", stat: ["dirty_air_sensitivity"], potential: ["chassis_starting_potential", "dirty_air_sensitivity"] },
        { label: "Aero efficiency", stat: ["aero_efficiency_rating"], potential: ["chassis_starting_potential", "aero_efficiency_rating"] }
    ],
    headquartersFields: [
        { key: "hospitality_pr_center", min: 1, max: 5 },
        { key: "wind_tunnel", min: 1, max: 10 },
        { key: "engine_plant", min: 1, max: 10 },
        { key: "test_track", min: 1, max: 5 },
        { key: "factory", min: 1, max: 5 },
        { key: "cfd_center", min: 1, max: 10 },
        { key: "recon_centre", min: 1, max: 5 },
        { key: "driver_centre", min: 1, max: 5 }
    ],

    validate(teams) {
        if (!Array.isArray(teams)) {
            throw new Error("JSON root must be an array of teams");
        }
        if (teams.some(team => !team || typeof team !== "object" || Array.isArray(team) || typeof team.name !== "string")) {
            throw new Error("Every team entry must be an object with a name");
        }
    }
};

window.TeamData = TeamData;
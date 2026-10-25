const TeamRandomizer = {
    getValue(object, path) {
        return path.reduce((value, key) => value?.[key], object);
    },

    setValue(object, path, value) {
        const parent = path.slice(0, -1).reduce((current, key) => current && current[key], object);
        if (parent) parent[path[path.length - 1]] = value;
    },

    shuffle(values) {
        const shuffled = values.slice();
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomNear(value, variation, min = 1, max = 100) {
        const amount = Math.max(0, Math.floor(Number(variation) || 0));
        const baseline = Math.min(max, Math.max(1, Number(value) || 1));
        if (min > baseline + amount) return min;
        const lower = Math.max(min, Math.ceil(baseline - amount));
        const upper = Math.min(max, Math.floor(baseline + amount));
        return lower <= upper ? this.randomInt(lower, upper) : Math.round(baseline);
    },

    process(sourceTeams, options, originalTeams = sourceTeams) {
        window.TeamData.validate(sourceTeams);
        const teams = JSON.parse(JSON.stringify(sourceTeams));
        const report = { stats: 0, potential: 0, potentialAdjusted: 0, budgets: 0, balances: 0, headquarters: 0 };

        teams.forEach((team, index) => {
            const original = originalTeams[index] || team;

            for (const { stat, potential } of window.TeamData.fields) {
                const statValue = this.getValue(team, stat);
                if ((options.randomizeStats || options.statsNearOriginal) && typeof statValue === "number") {
                    const originalStat = this.getValue(original, stat);
                    const value = options.statsNearOriginal
                        ? this.randomNear(typeof originalStat === "number" ? originalStat : statValue, options.statsVariation)
                        : this.randomInt(1, 100);
                    this.setValue(team, stat, value);
                    if (stat[0] === "aero_efficiency_rating" && typeof team.aero?.efficiency_rating === "number") {
                        team.aero.efficiency_rating = value;
                    }
                    report.stats++;
                }

                const potentialValue = this.getValue(team, potential);
                if (typeof potentialValue !== "number") continue;

                const currentStat = this.getValue(team, stat);
                const minimum = Math.max(1, Math.ceil(typeof currentStat === "number" ? currentStat : 1));
                if (options.randomizePotential || options.potentialNearOriginal) {
                    const originalPotential = this.getValue(original, potential);
                    const value = options.potentialNearOriginal
                        ? this.randomNear(
                            typeof originalPotential === "number" ? originalPotential : potentialValue,
                            options.potentialVariation,
                            minimum
                        )
                        : this.randomInt(minimum, 100);
                    this.setValue(team, potential, value);
                    report.potential++;
                } else if ((options.randomizeStats || options.statsNearOriginal || options.randomizePotential || options.potentialNearOriginal) && potentialValue < minimum) {
                    this.setValue(team, potential, Math.min(100, minimum));
                    report.potentialAdjusted++;
                }
            }
        });

        if (options.randomizeFinance) {
            const budgets = teams.filter(team => typeof team.budget_m === "number").map(team => team.budget_m);
            const shuffledBudgets = this.shuffle(budgets);
            let budgetIndex = 0;
            teams.forEach(team => {
                if (typeof team.budget_m === "number") {
                    team.budget_m = shuffledBudgets[budgetIndex++];
                    report.budgets++;
                }
                if (typeof team.starting_balance_m === "number" && typeof team.budget_m === "number") {
                    team.starting_balance_m = this.randomInt(0, Math.floor(team.budget_m * 10)) / 10;
                    report.balances++;
                }
            });
        }

        teams.forEach((team, index) => {
            if (!options.randomizeHeadquarters || !team.headquarters) return;
            for (const { key, min, max } of window.TeamData.headquartersFields) {
                if (typeof team.headquarters[key] !== "number") continue;
                if (key === "engine_plant" && !(originalTeams[index]?.headquarters?.engine_plant >= 1)) continue;
                team.headquarters[key] = this.randomInt(min, max);
                report.headquarters++;
            }
        });

        return { teams, report };
    }
};

window.TeamRandomizer = TeamRandomizer;
const SponsorRandomizer = {
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomDecimal(min, max) {
        const value = min + Math.random() * (max - min);
        return Math.min(max, Math.max(min, Number(value.toFixed(1))));
    },

    roundDecimal(value) {
        return Number(value.toFixed(1));
    },

    process(source, options) {
        if (!Array.isArray(source)) {
            throw new Error("Expected a sponsors JSON array");
        }

        const sponsors = JSON.parse(JSON.stringify(source));
        const tiers = new Map(options.paymentTiers.map(tier => [tier.level, tier]));
        const report = { rating: 0, amount_m: 0 };

        for (const sponsor of sponsors) {
            if (!sponsor || typeof sponsor !== "object" || Array.isArray(sponsor)) continue;

            if (options.randomizeRating && Number.isFinite(sponsor.rating)) {
                sponsor.rating = this.randomInt(1, 10);
                report.rating++;
            }

            if (!options.randomizePayment || !Number.isFinite(sponsor.amount_m)) continue;
            const tier = tiers.get(sponsor.rating);
            if (!tier) continue;

            sponsor.amount_m = this.randomDecimal(tier.min, tier.max);
            sponsor.amount_range_m = [
                this.roundDecimal(Math.max(0, sponsor.amount_m - options.amountRange)),
                this.roundDecimal(sponsor.amount_m + options.amountRange)
            ];
            report.amount_m++;
        }

        return { sponsors, report };
    },

    validateStarting(data) {
        if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.teams)) {
            throw new Error("Starting sponsors JSON must contain a teams array");
        }
        if (data.teams.some(team => !team || typeof team !== "object" || Array.isArray(team) ||
            typeof team.team !== "string" || !Array.isArray(team.sponsors) ||
            team.sponsors.some(sponsor => !sponsor || typeof sponsor !== "object" || Array.isArray(sponsor) ||
                typeof sponsor.name !== "string"))) {
            throw new Error("Every starting team must have a name and a sponsors array with named sponsors");
        }
    },

    randomizeStarting(source) {
        this.validateStarting(source);
        const data = JSON.parse(JSON.stringify(source));
        const sponsors = data.teams.flatMap(team => team.sponsors);
        const names = sponsors.map(sponsor => sponsor.name);

        for (let index = names.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
        }
        sponsors.forEach((sponsor, index) => {
            sponsor.name = names[index];
        });

        return { data, teamCount: data.teams.length, sponsorCount: sponsors.length };
    }
};

window.SponsorRandomizer = SponsorRandomizer;
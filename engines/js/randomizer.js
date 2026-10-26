const EngineRandomizer = {
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomDecimal(min, max) {
        const value = min + Math.random() * (max - min);
        return Math.min(max, Math.max(min, Number(value.toFixed(1))));
    },

    process(source, options) {
        if (!source || typeof source !== "object" || Array.isArray(source) ||
            !source.suppliers || typeof source.suppliers !== "object" || Array.isArray(source.suppliers)) {
            throw new Error("Expected an engine JSON object with a suppliers map");
        }

        const data = JSON.parse(JSON.stringify(source));
        const fields = [
            { key: "power_rating", enabled: options.randomizePower, min: options.powerMin, max: options.powerMax, precision: 0 },
            { key: "reliability_rating", enabled: options.randomizeReliability, min: options.reliabilityMin, max: options.reliabilityMax, precision: 0 },
            { key: "fuel_efficiency", enabled: options.randomizeFuelEfficiency, min: options.fuelEfficiencyMin, max: options.fuelEfficiencyMax, precision: 0 },
            { key: "mass_kg", enabled: options.randomizeMass, min: options.massMin, max: options.massMax, precision: 1 },
            { key: "cost_m", enabled: options.randomizeCost, min: options.costMin, max: options.costMax, precision: 1 }
        ];
        const report = Object.fromEntries(fields.map(({ key }) => [key, 0]));

        for (const supplier of Object.values(data.suppliers)) {
            if (!supplier || typeof supplier !== "object" || Array.isArray(supplier)) continue;
            for (const field of fields) {
                if (!field.enabled || typeof supplier[field.key] !== "number" || !Number.isFinite(supplier[field.key])) continue;
                supplier[field.key] = field.precision === 0
                    ? this.randomInt(field.min, field.max)
                    : this.randomDecimal(field.min, field.max);
                report[field.key]++;
            }
        }

        return { data, report };
    }
};

window.EngineRandomizer = EngineRandomizer;

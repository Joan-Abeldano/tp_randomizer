const RegulationsRandomizer = {
    fields: [
        { id: "car_profile", category: "car_profile", property: "default", label: "Car profile" },
        { id: "safety_car_policy", category: "safety_car_policy", property: "default", label: "Safety car policy" },
        { id: "weekend_tyre_allocation", category: "weekend_tyre_allocation", property: "default", label: "Weekend tyre allocation" },
        { id: "reliability_profile", category: "reliability_profile", property: "default", label: "Reliability profile" },
        { id: "technical_regulation_era", category: "technical_regulation_era", property: "default", label: "Technical regulation era" },
        { id: "technical_regulation_severity", category: "technical_regulation_era", property: "default_severity", label: "Technical regulation severity" },
        { id: "handling_complexity_era", category: "handling_complexity_era", property: "default", label: "Handling complexity era" },
        { id: "chassis_minimum_weight", category: "chassis_minimum_weight", property: "default", label: "Chassis minimum weight" },
        { id: "driver_aid_restrictions", category: "driver_aid_restrictions", property: "default", label: "Driver aid restrictions" },
        { id: "drs_policy", category: "drs_policy", property: "default", label: "DRS policy" },
        { id: "ers_policy", category: "ers_policy", property: "default", label: "ERS policy" },
        { id: "points_system", category: "points_system", property: "default", label: "Points system" },
        { id: "pole_point", category: "pole_point", property: "default", label: "Pole point" },
        { id: "fastest_lap_point", category: "fastest_lap_point", property: "default", label: "Fastest lap point" },
        { id: "qualifying_format", category: "qualifying_format", property: "default", label: "Qualifying format" },
        { id: "prize_money_distribution", category: "prize_money_distribution", property: "default", label: "Prize money distribution" },
        { id: "private_testing_limits", category: "private_testing_limits", property: "default", label: "Private testing limits" },
        { id: "seasonal_component_allocation_rule", category: "seasonal_component_allocation_rule", property: "default", label: "Seasonal component allocation rule" },
        { id: "tyre_profile", category: "tyre_profile", property: "default", label: "Tyre profile" },
        { id: "formula_refueling", category: "formula_refueling", property: "default", label: "Race refuelling" },
        { id: "formula_fuel_tank", category: "formula_fuel_tank", property: "default", label: "Fuel tank capacity" },
        { id: "formula_compound_usage", category: "formula_compound_usage", property: "default", label: "Mandatory tyre compound usage" },
        { id: "formula_team_entry_cap", category: "formula_team_entry_cap", property: "default", label: "Maximum entries per team" },
        { id: "formula_team_entry_requirement", category: "formula_team_entry_requirement", property: "default", label: "Entry count requirement" }
    ],

    validate(source) {
        if (!source || typeof source !== "object" || Array.isArray(source) || !Array.isArray(source.categories)) {
            throw new Error("JSON must contain a categories array");
        }

        for (const field of this.fields) {
            const category = source.categories.find(item => item && item.key === field.category);
            if (!category || !Array.isArray(category.options)) {
                throw new Error(`Missing regulation category or options: ${field.category}`);
            }
            const values = field.property === "default_severity"
                ? Object.keys(category.severities || {})
                : category.options.map(option => option.key);
            if (!values.includes(category[field.property])) {
                throw new Error(`Invalid ${field.property} for ${field.category}`);
            }
        }
    },

    choose(values, weights = {}) {
        if (!values.length) throw new Error("Cannot choose from an empty set of regulation options");
        const normalizedWeights = values.map(value => {
            const weight = weights[value];
            return Number.isFinite(weight) && weight >= 0 ? weight : 1;
        });
        const totalWeight = normalizedWeights.reduce((total, weight) => total + weight, 0);
        if (totalWeight <= 0) return values[Math.floor(Math.random() * values.length)];

        let target = Math.random() * totalWeight;
        for (let index = 0; index < values.length; index++) {
            target -= normalizedWeights[index];
            if (target < 0) return values[index];
        }
        return values[values.length - 1];
    },

    process(source, options) {
        this.validate(source);
        const data = JSON.parse(JSON.stringify(source));
        const report = [];

        for (const field of this.fields) {
            if (!options[field.id]) continue;
            const category = data.categories.find(item => item.key === field.category);
            const previous = category[field.property];
            const values = field.property === "default_severity"
                ? Object.keys(category.severities)
                : category.options.map(option => option.key);
            const weights = field.property === "default_severity"
                ? category.severity_weights || {}
                : Object.fromEntries(category.options.map(option => [option.key, option.weight]));
            category[field.property] = this.choose(values, weights);
            report.push({ ...field, previous, value: category[field.property] });
        }

        return { data, report };
    }
};

window.RegulationsRandomizer = RegulationsRandomizer;
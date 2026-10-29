const TyreSupplierRandomizer = {
    fields: [
        { id: "joinChance", category: "Chances", label: "Join chance", paths: ["join_chance"], precision: 3, minLimit: 0, maxLimit: 1 },
        { id: "leaveChance", category: "Chances", label: "Leave chance", paths: ["leave_chance"], precision: 3, minLimit: 0, maxLimit: 1 },
        { id: "worksPrice", category: "Prices", label: "Works price", paths: ["prices.works"], precision: 1, minLimit: 0 },
        { id: "partnerPrice", category: "Prices", label: "Partner price", paths: ["prices.partner"], precision: 1, minLimit: 0 },
        { id: "customerPrice", category: "Prices", label: "Customer price", paths: ["prices.customer"], precision: 1, minLimit: 0 },
        { id: "lateralGripTrend", category: "Development trends", label: "Lateral grip", paths: ["trend.lateral_grip"], precision: 3 },
        { id: "longitudinalGripTrend", category: "Development trends", label: "Longitudinal grip", paths: ["trend.longitudinal_grip"], precision: 3 },
        { id: "durabilityTrend", category: "Development trends", label: "Durability", paths: ["trend.durability"], precision: 3 },
        { id: "temperatureToleranceTrend", category: "Development trends", label: "Temperature tolerance", paths: ["trend.temperature_tolerance"], precision: 3 },
        { id: "lateralGripVariance", category: "Development variance", label: "Lateral grip", paths: ["variance.lateral_grip"], precision: 3, minLimit: 0 },
        { id: "longitudinalGripVariance", category: "Development variance", label: "Longitudinal grip", paths: ["variance.longitudinal_grip"], precision: 3, minLimit: 0 },
        { id: "durabilityVariance", category: "Development variance", label: "Durability", paths: ["variance.durability"], precision: 3, minLimit: 0 },
        { id: "temperatureToleranceVariance", category: "Development variance", label: "Temperature tolerance", paths: ["variance.temperature_tolerance"], precision: 3, minLimit: 0 },
        { id: "lateralGripRatings", category: "Tyre ratings", label: "Lateral grip", paths: ["lateral_grip.soft", "lateral_grip.medium", "lateral_grip.hard", "lateral_grip.intermediate", "lateral_grip.wet"], precision: 1, minLimit: 0, maxLimit: 100 },
        { id: "longitudinalGripRatings", category: "Tyre ratings", label: "Longitudinal grip", paths: ["longitudinal_grip.soft", "longitudinal_grip.medium", "longitudinal_grip.hard", "longitudinal_grip.intermediate", "longitudinal_grip.wet"], precision: 1, minLimit: 0, maxLimit: 100 },
        { id: "durabilityRatings", category: "Tyre ratings", label: "Durability", paths: ["durability.soft", "durability.medium", "durability.hard", "durability.intermediate", "durability.wet"], precision: 1, minLimit: 0, maxLimit: 100 },
        { id: "temperatureToleranceRatings", category: "Tyre ratings", label: "Temperature tolerance", paths: ["temperature_tolerance.soft", "temperature_tolerance.medium", "temperature_tolerance.hard", "temperature_tolerance.intermediate", "temperature_tolerance.wet"], precision: 1, minLimit: 0, maxLimit: 100 }
    ],

    randomDecimal(min, max, precision) {
        const scale = 10 ** precision;
        const minValue = Math.round(min * scale);
        const maxValue = Math.round(max * scale);
        return Math.floor(Math.random() * (maxValue - minValue + 1)) / scale + minValue / scale;
    },

    getPath(object, path) {
        return path.split(".").reduce((value, key) => value?.[key], object);
    },

    setPath(object, path, value) {
        const keys = path.split(".");
        const property = keys.pop();
        const parent = keys.reduce((current, key) => current?.[key], object);
        if (parent && property) parent[property] = value;
    },

    process(source, options) {
        if (!source || typeof source !== "object" || Array.isArray(source) ||
            !source.suppliers || typeof source.suppliers !== "object" || Array.isArray(source.suppliers)) {
            throw new Error("Expected a tyre suppliers JSON object with a suppliers map");
        }

        const data = JSON.parse(JSON.stringify(source));
        const report = Object.fromEntries(this.fields.map(field => [field.id, 0]));
        const suppliers = Object.entries(data.suppliers)
            .filter(([, supplier]) => supplier && typeof supplier === "object" && !Array.isArray(supplier));

        if (options.randomizeSupplierStatus) {
            const activeCount = options.activeSupplierCount;
            if (!Number.isInteger(activeCount) || activeCount < 0 || activeCount > suppliers.length) {
                throw new Error(`Active supplier count must be between 0 and ${suppliers.length}`);
            }
            const shuffledNames = suppliers.map(([name]) => name);
            for (let index = shuffledNames.length - 1; index > 0; index--) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                [shuffledNames[index], shuffledNames[swapIndex]] = [shuffledNames[swapIndex], shuffledNames[index]];
            }
            const activeNames = new Set(shuffledNames.slice(0, activeCount));
            for (const [name, supplier] of suppliers) {
                supplier.active = activeNames.has(name);
            }
            report.activeSuppliers = activeCount;
        }

        for (const [, supplier] of suppliers) {
            for (const field of this.fields) {
                const enabled = options[`randomize_${field.id}`];
                if (!enabled) continue;
                for (const path of field.paths) {
                    const value = this.getPath(supplier, path);
                    if (!Number.isFinite(value)) continue;
                    this.setPath(supplier, path, this.randomDecimal(
                        options[`${field.id}Min`],
                        options[`${field.id}Max`],
                        field.precision
                    ));
                    report[field.id]++;
                }
            }
        }

        return { data, report };
    }
};

window.TyreSupplierRandomizer = TyreSupplierRandomizer;
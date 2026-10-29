const PartsRandomizer = {
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomDecimal(min, max, precision) {
        const scale = 10 ** precision;
        const minValue = Math.round(min * scale);
        const maxValue = Math.round(max * scale);
        return this.randomInt(minValue, maxValue) / scale;
    },

    shuffle(values) {
        const shuffled = [...values];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    },

    process(source, options) {
        if (!source || typeof source !== "object" || Array.isArray(source) ||
            !source.categories || typeof source.categories !== "object" || Array.isArray(source.categories) ||
            !source.default_contracts || typeof source.default_contracts !== "object" || Array.isArray(source.default_contracts)) {
            throw new Error("Expected a parts JSON object with categories and default_contracts maps");
        }

        const data = JSON.parse(JSON.stringify(source));
        const selectedCategories = new Set(
            Array.isArray(options.selectedCategories) ? options.selectedCategories : Object.keys(data.categories)
        );
        const report = {
            base_wear_per_lap: 0,
            fail_prob_per_lap_over_50_wear: 0,
            pace_rating: 0,
            reliability_rating: 0,
            budget_m: 0,
            dev_weights: 0,
            allocation_per_season: 0,
            max_customers: 0,
            contract_suppliers: 0,
            contract_types: 0,
            years: 0,
            parts_per_season: 0
        };

        const randomizeCategoryValue = (key, enabled, min, max, precision) => {
            if (!enabled) return;
            for (const [categoryKey, category] of Object.entries(data.categories)) {
                if (!selectedCategories.has(categoryKey)) continue;
                if (!Number.isFinite(category[key])) continue;
                category[key] = precision === 0
                    ? this.randomInt(min, max)
                    : this.randomDecimal(min, max, precision);
                report[key]++;
            }
        };
        const randomizeSupplierValue = (key, enabled, min, max, precision) => {
            if (!enabled) return;
            for (const [categoryKey, category] of Object.entries(data.categories)) {
                if (!selectedCategories.has(categoryKey)) continue;
                for (const supplier of Object.values(category.suppliers || {})) {
                    if (!supplier || !Number.isFinite(supplier[key])) continue;
                    supplier[key] = precision === 0
                        ? this.randomInt(min, max)
                        : this.randomDecimal(min, max, precision);
                    report[key]++;
                }
            }
        };

        randomizeCategoryValue("base_wear_per_lap", options.randomizeWear, options.wearMin, options.wearMax, 4);
        randomizeCategoryValue("fail_prob_per_lap_over_50_wear", options.randomizeFailure, options.failureMin, options.failureMax, 4);
        randomizeSupplierValue("pace_rating", options.randomizePace, options.paceMin, options.paceMax, 0);
        randomizeSupplierValue("reliability_rating", options.randomizeReliability, options.reliabilityMin, options.reliabilityMax, 0);
        randomizeSupplierValue("budget_m", options.randomizeBudget, options.budgetMin, options.budgetMax, 1);
        randomizeSupplierValue("allocation_per_season", options.randomizeAllocation, options.allocationMin, options.allocationMax, 0);
        randomizeSupplierValue("max_customers", options.randomizeCustomers, options.customersMin, options.customersMax, 0);

        if (options.randomizeWeights) {
            for (const [categoryKey, category] of Object.entries(data.categories)) {
                if (!selectedCategories.has(categoryKey)) continue;
                for (const supplier of Object.values(category.suppliers || {})) {
                    const weights = supplier && supplier.dev_weights;
                    if (!weights || !Number.isFinite(weights.pace) || !Number.isFinite(weights.reliability)) continue;
                    weights.pace = this.randomDecimal(options.weightsMin, options.weightsMax, 2);
                    weights.reliability = Number((1 - weights.pace).toFixed(2));
                    report.dev_weights++;
                }
            }
        }

        const contractsByCategory = new Map();
        const allContracts = [];
        for (const teamContracts of Object.values(data.default_contracts)) {
            if (!teamContracts || typeof teamContracts !== "object" || Array.isArray(teamContracts)) continue;
            for (const [categoryKey, contract] of Object.entries(teamContracts)) {
                if (!contract || typeof contract !== "object" || Array.isArray(contract)) continue;
                if (!selectedCategories.has(categoryKey)) continue;
                if (!contractsByCategory.has(categoryKey)) contractsByCategory.set(categoryKey, []);
                contractsByCategory.get(categoryKey).push(contract);
                allContracts.push(contract);
            }
        }

        if (options.randomizeContractSuppliers) {
            for (const [categoryKey, contracts] of contractsByCategory) {
                const suppliers = data.categories[categoryKey]?.suppliers;
                if (!suppliers) continue;
                const validNames = Object.keys(suppliers);
                const assignments = contracts.map(contract =>
                    Object.hasOwn(suppliers, contract.supplier) ? contract.supplier : validNames[0]
                );
                this.shuffle(assignments).forEach((supplierName, index) => {
                    contracts[index].supplier = supplierName;
                    report.contract_suppliers++;
                });
            }
        }

        if (options.randomizeContractTypes) {
            for (const contracts of contractsByCategory.values()) {
                const types = contracts.map(contract => contract.type).filter(type => typeof type === "string");
                this.shuffle(types).forEach((type, index) => {
                    const contract = contracts[index];
                    if (contract && typeof contract.type === "string") {
                        contract.type = type;
                        report.contract_types++;
                    }
                });
            }
        }

        for (const contract of allContracts) {
            if (options.randomizeContractYears && Number.isFinite(contract.years)) {
                contract.years = this.randomInt(options.contractYearsMin, options.contractYearsMax);
                report.years++;
            }
            if (options.randomizePartsPerSeason && Number.isFinite(contract.parts_per_season)) {
                contract.parts_per_season = this.randomInt(options.partsPerSeasonMin, options.partsPerSeasonMax);
                report.parts_per_season++;
            }
        }

        return { data, report };
    }
};

window.PartsRandomizer = PartsRandomizer;
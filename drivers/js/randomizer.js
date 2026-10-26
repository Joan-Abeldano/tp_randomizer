const Randomizer = {
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    pick(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    shuffle(array) {
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    isCompatible(candidate, existing) {
        const blocked = window.GameData.INCOMPATIBLE[candidate] || [];
        if (existing.some(p => blocked.includes(p))) return false;
        for (const p of existing) {
            const pBlocked = window.GameData.INCOMPATIBLE[p] || [];
            if (pBlocked.includes(candidate)) return false;
        }
        return true;
    },

    randomTraits() {
        const count = this.randInt(1, window.GameData.MAX_TRAITS);
        const pool = this.shuffle(window.GameData.TRAITS);
        return pool.slice(0, count);
    },

    randomPersonalities() {
        const count = this.randInt(window.GameData.MIN_PERSONALITIES, window.GameData.MAX_PERSONALITIES);
        const pool = this.shuffle(window.GameData.PERSONALITIES);
        const result = [];
        for (const p of pool) {
            if (result.length >= count) break;
            if (this.isCompatible(p, result)) {
                result.push(p);
            }
        }
        if (result.length === 0 && pool.length > 0) {
            result.push(pool[0]);
        }
        return result;
    },

    randomStatForBracket(bracket) {
        return this.randInt(bracket.stats.min, bracket.stats.max);
    },

    randomPreference(min, max) {
        return this.randInt(min, max);
    },

    randomTalent(min, max) {
        return this.randInt(min, max);
    },

    randomTalentNear(talent, variation) {
        const amount = Math.max(0, Math.floor(Number(variation) || 0));
        const min = Math.max(window.GameData.TALENT_MIN, talent - amount);
        const max = Math.min(window.GameData.TALENT_MAX, talent + amount);
        return this.randInt(min, max);
    },

    zeroHistory(driver) {
        if (!driver.history) driver.history = {};
        const fields = ["seasons", "championships", "wins", "podiums", "poles", "starts", "points"];
        for (const f of fields) {
            driver.history[f] = 0;
        }
    },

    clearContracts(driver) {
        driver.team = null;
        if (driver.contract) {
            driver.contract = {
                team: null,
                length_weeks: 0,
                salary_m: 0.0,
                start_week: 1
            };
        }
        if (driver.future_contract) {
            delete driver.future_contract;
        }
    },

    randomizeStatsForAge(driver) {
        const bracket = window.AgeConfig.findBracket(driver.age || 25);
        for (const stat of window.GameData.STATS_FIELDS) {
            driver[stat] = this.randomStatForBracket(bracket);
        }
        return bracket;
    },

    randomizeStatsFlat(driver, min, max) {
        for (const stat of window.GameData.STATS_FIELDS) {
            driver[stat] = this.randInt(min, max);
        }
    },

    randomizeIndividualStats(driver, ranges) {
        for (const [stat, range] of Object.entries(ranges)) {
            if (range.enabled) {
                driver[stat] = this.randInt(range.min, range.max);
            }
        }
    },

    randomizeStatsOverall(driver, minOverall, maxOverall) {
        let remaining = this.randInt(minOverall, maxOverall);
        const stats = window.GameData.STATS_FIELDS;
        stats.forEach((stat, index) => {
            const statsLeft = stats.length - index - 1;
            const min = Math.max(window.GameData.STAT_MIN, remaining - statsLeft * window.GameData.STAT_MAX);
            const max = Math.min(window.GameData.STAT_MAX, remaining - statsLeft * window.GameData.STAT_MIN);
            driver[stat] = this.randInt(min, max);
            remaining -= driver[stat];
        });
    },

    process(drivers, options, originalDrivers = drivers) {
        if (!Array.isArray(drivers)) {
            throw new Error("Expected an array of drivers");
        }
        const report = {
            total: drivers.length,
            processed: 0,
            statsRandomized: 0,
            defaultStats: 0,
            individualStatsRandomized: 0,
            overallStatsRandomized: 0,
            traitsRandomized: 0,
            personalitiesRandomized: 0,
            historyZeroed: 0,
            balanceRandomized: 0,
            tractionRandomized: 0,
            talentRandomized: 0,
            contractsCleared: 0
        };

        const result = drivers.map((driver, index) => {
            const clone = JSON.parse(JSON.stringify(driver));
            const originalTalent = originalDrivers[index]?.talent ?? driver.talent;

            if (options.perAgeStats) {
                this.randomizeStatsForAge(clone);
                report.statsRandomized++;
            } else if (options.overallStats) {
                this.randomizeStatsOverall(clone, options.overallMin, options.overallMax);
                report.overallStatsRandomized++;
            } else if (options.defaultStats) {
                this.randomizeStatsFlat(clone, options.statsMin, options.statsMax);
                report.defaultStats++;
            }

            if (options.randomizeIndividualStats) {
                this.randomizeIndividualStats(clone, options.individualStats);
                report.individualStatsRandomized++;
            }

            if (options.randomizeTraits) {
                clone.traits = this.randomTraits();
                report.traitsRandomized++;
            }

            if (options.randomizePersonalities) {
                clone.personalities = this.randomPersonalities();
                report.personalitiesRandomized++;
            }

            if (options.zeroHistory) {
                this.zeroHistory(clone);
                report.historyZeroed++;
            }

            if (options.randomizeBalance) {
                clone.balance_preference = this.randomPreference(options.balanceMin, options.balanceMax);
                report.balanceRandomized++;
            }

            if (options.randomizeTraction) {
                clone.traction_preference = this.randomPreference(options.tractionMin, options.tractionMax);
                report.tractionRandomized++;
            }

            if (options.randomizeTalentNear) {
                clone.talent = this.randomTalentNear(originalTalent, options.talentVariation);
                report.talentRandomized++;
            } else if (options.randomizeTalent) {
                clone.talent = this.randomTalent(options.talentMin, options.talentMax);
                report.talentRandomized++;
            }

            if (options.clearContracts) {
                this.clearContracts(clone);
                report.contractsCleared++;
            }

            report.processed++;
            return clone;
        });

        return { drivers: result, report };
    }
};

window.Randomizer = Randomizer;

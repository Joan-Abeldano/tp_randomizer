const StaffRandomizer = {
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomizeFields(object, min, max) {
        for (const [key, value] of Object.entries(object || {})) {
            if (typeof value === "number" && Number.isFinite(value)) {
                object[key] = this.randInt(min, max);
            }
        }
    },

    clearContracts(staff) {
        staff.team = null;
        if (staff.contract) {
            staff.contract = {
                team: null,
                length_weeks: 0,
                salary_m: 0.0,
                start_week: 1
            };
        }
        if (staff.future_contract) {
            delete staff.future_contract;
        }
    },

    process(sourceStaff, options) {
        if (!Array.isArray(sourceStaff)) {
            throw new Error("Expected an array of staff records");
        }

        const report = {
            processed: sourceStaff.length,
            skills: 0,
            talent: 0,
            overallSkill: 0,
            contractsCleared: 0
        };

        const staff = sourceStaff.map(person => {
            const clone = JSON.parse(JSON.stringify(person));

            if (options.randomizeSkills && clone.skills && typeof clone.skills === "object" && !Array.isArray(clone.skills)) {
                this.randomizeFields(clone.skills, options.skillsMin, options.skillsMax);
                report.skills++;
            }
            if (options.randomizeTalent && clone.talent && typeof clone.talent === "object" && !Array.isArray(clone.talent)) {
                this.randomizeFields(clone.talent, options.talentMin, options.talentMax);
                report.talent++;
            }
            if (options.randomizeOverallSkill && typeof clone.skill === "number" && Number.isFinite(clone.skill)) {
                clone.skill = this.randInt(options.overallSkillMin, options.overallSkillMax);
                report.overallSkill++;
            }
            if (options.clearContracts) {
                this.clearContracts(clone);
                report.contractsCleared++;
            }

            return clone;
        });

        return { staff, report };
    }
};

window.StaffRandomizer = StaffRandomizer;

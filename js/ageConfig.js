const AgeConfig = {
    brackets: JSON.parse(JSON.stringify(window.GameData.DEFAULT_AGE_BRACKETS)),

    getAll() {
        return this.brackets;
    },

    get() {
        return this.brackets;
    },

    findBracket(age) {
        return this.brackets.find(b => age >= b.min && age <= b.max) || this.brackets[this.brackets.length - 1];
    },

    updateBracket(index, updates) {
        if (this.brackets[index]) {
            Object.assign(this.brackets[index], updates);
        }
    },

    reset() {
        this.brackets = JSON.parse(JSON.stringify(window.GameData.DEFAULT_AGE_BRACKETS));
    },

    addBracket() {
        const last = this.brackets[this.brackets.length - 1];
        const newMin = last ? last.max + 1 : 0;
        this.brackets.push({
            label: `Custom (${newMin}+)`,
            min: newMin,
            max: newMin + 5,
            stats: { min: 5, max: 15 },
            talent: { min: 50, max: 85 }
        });
    },

    removeBracket(index) {
        if (this.brackets.length > 1) {
            this.brackets.splice(index, 1);
        }
    }
};

window.AgeConfig = AgeConfig;

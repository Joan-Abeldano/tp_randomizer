const ScheduleRandomizer = {
    WEEK_COUNT: 52,

    validate(schedule) {
        if (!Array.isArray(schedule) || schedule.length !== this.WEEK_COUNT) {
            throw new Error("Schedule JSON must be an array of exactly 52 weeks");
        }
        if (schedule.some(track => track !== null && typeof track !== "string")) {
            throw new Error("Each schedule week must contain a track name or null");
        }
    },

    shuffle(schedule, openingWeek, finaleWeek) {
        const result = [...schedule];
        for (let index = finaleWeek - 1; index > openingWeek - 1; index--) {
            const swapIndex = openingWeek - 1 + Math.floor(Math.random() * (index - openingWeek + 2));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    },

    randomize(schedule, tracks, count, openingWeek, finaleWeek) {
        const result = [...schedule];
        const firstIndex = openingWeek - 1;
        const weekCount = finaleWeek - openingWeek + 1;
        const selectedTracks = [...tracks];
        const availableWeeks = Array.from({ length: weekCount }, (_, index) => firstIndex + index);

        for (let index = selectedTracks.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [selectedTracks[index], selectedTracks[swapIndex]] = [selectedTracks[swapIndex], selectedTracks[index]];
        }
        for (let index = availableWeeks.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [availableWeeks[index], availableWeeks[swapIndex]] = [availableWeeks[swapIndex], availableWeeks[index]];
        }

        for (let index = firstIndex; index < firstIndex + weekCount; index++) result[index] = null;
        for (let index = 0; index < count; index++) result[availableWeeks[index]] = selectedTracks[index];
        return result;
    }
};

window.ScheduleRandomizer = ScheduleRandomizer;
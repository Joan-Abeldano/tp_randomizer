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

    shuffle(schedule, openingWeek, finaleWeek, maxConsecutiveWeeks = 0) {
        const tracks = schedule.slice(openingWeek - 1, finaleWeek).filter(Boolean);
        return this.randomize(schedule, tracks, tracks.length, openingWeek, finaleWeek, maxConsecutiveWeeks);
    },

    randomize(schedule, tracks, count, openingWeek, finaleWeek, maxConsecutiveWeeks = 0) {
        const result = [...schedule];
        const firstIndex = openingWeek - 1;
        const weekCount = finaleWeek - openingWeek + 1;
        const selectedTracks = [...tracks];
        const requiredWeeks = weekCount === 1 ? [firstIndex] : [firstIndex, firstIndex + weekCount - 1];
        if (!Number.isInteger(maxConsecutiveWeeks) || maxConsecutiveWeeks < 0 || maxConsecutiveWeeks > this.WEEK_COUNT) {
            throw new Error("Maximum consecutive race weeks must be between 0 and 52");
        }
        if (count < requiredWeeks.length) {
            throw new Error(`At least ${requiredWeeks.length} tracks are required to place races in both boundary weeks`);
        }

        for (let index = selectedTracks.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [selectedTracks[index], selectedTracks[swapIndex]] = [selectedTracks[swapIndex], selectedTracks[index]];
        }

        for (let index = firstIndex; index < firstIndex + weekCount; index++) result[index] = null;
                if (maxConsecutiveWeeks === 0) {
                    const requiredSet = new Set(requiredWeeks);
                    const availableWeeks = Array.from({ length: weekCount }, (_, index) => firstIndex + index)
                        .filter(week => !requiredSet.has(week));
                    for (let index = availableWeeks.length - 1; index > 0; index--) {
                        const swapIndex = Math.floor(Math.random() * (index + 1));
                        [availableWeeks[index], availableWeeks[swapIndex]] = [availableWeeks[swapIndex], availableWeeks[index]];
                    }
                    const raceWeeks = requiredWeeks.concat(availableWeeks.slice(0, count - requiredWeeks.length)).sort((a, b) => a - b);
                    for (let index = 0; index < count; index++) result[raceWeeks[index]] = selectedTracks[index];
                    return result;
                }

                let fixedRun = 0;
                for (let index = 0; index < result.length; index++) {
                    if (index >= firstIndex && index < firstIndex + weekCount) {
                        fixedRun = 0;
                        continue;
                    }
                    fixedRun = result[index] ? fixedRun + 1 : 0;
                    if (fixedRun > maxConsecutiveWeeks) {
                        throw new Error("Existing races outside the selected week range already exceed the consecutive-week limit");
                    }
                }

                let prefixRun = 0;
                for (let index = firstIndex - 1; index >= 0 && result[index]; index--) prefixRun++;
                let suffixRun = 0;
                for (let index = firstIndex + weekCount; index < result.length && result[index]; index++) suffixRun++;

                const memo = new Map();
                const canComplete = (offset, currentRun, racesLeft) => {
                    const weeksLeft = weekCount - offset;
                    if (racesLeft < 0 || racesLeft > weeksLeft) return false;
                    if (offset === weekCount) return racesLeft === 0 && currentRun + suffixRun <= maxConsecutiveWeeks;
                    const key = `${offset}:${currentRun}:${racesLeft}`;
                    if (memo.has(key)) return memo.get(key);
                    const requiredWeek = offset === 0 || offset === weekCount - 1;
                    const possible = requiredWeek
                        ? currentRun < maxConsecutiveWeeks && canComplete(offset + 1, currentRun + 1, racesLeft - 1)
                        : canComplete(offset + 1, 0, racesLeft) ||
                            (currentRun < maxConsecutiveWeeks && canComplete(offset + 1, currentRun + 1, racesLeft - 1));
                    memo.set(key, possible);
                    return possible;
                };

                if (!canComplete(0, prefixRun, count)) {
                    throw new Error(`Cannot place ${count} tracks in weeks ${openingWeek} and ${finaleWeek} without exceeding ${maxConsecutiveWeeks} consecutive race weeks`);
                }

                const raceWeeks = [];
                let currentRun = prefixRun;
                let racesLeft = count;
                for (let offset = 0; offset < weekCount; offset++) {
                    const requiredWeek = offset === 0 || offset === weekCount - 1;
                    const canPlaceRace = currentRun < maxConsecutiveWeeks &&
                        canComplete(offset + 1, currentRun + 1, racesLeft - 1);
                    const canLeaveEmpty = !requiredWeek && canComplete(offset + 1, 0, racesLeft);
                    if (canPlaceRace && (requiredWeek || !canLeaveEmpty || Math.random() < 0.5)) {
                        raceWeeks.push(firstIndex + offset);
                        currentRun++;
                        racesLeft--;
                    } else {
                        currentRun = 0;
                    }
                }

                for (let index = 0; index < count; index++) result[raceWeeks[index]] = selectedTracks[index];
        return result;
    }
};

window.ScheduleRandomizer = ScheduleRandomizer;
const App = {
    state: {
        source: null,
        result: null,
        tracks: [],
        scheduleFileName: "schedule.json",
        resultIsOriginal: false
    },

    init() {
        this.bindUpload("scheduleDropZone", "scheduleFileInput", files => this.handleScheduleFile(files[0]));
        this.bindUpload("trackDropZone", "trackFileInput", files => this.handleTrackFiles(files));
        this.bindActions();
    },

    bindUpload(zoneId, inputId, onFiles) {
        const dropZone = document.getElementById(zoneId);
        const fileInput = document.getElementById(inputId);

        dropZone.addEventListener("click", () => fileInput.click());
        dropZone.addEventListener("dragover", event => {
            event.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
        dropZone.addEventListener("drop", event => {
            event.preventDefault();
            dropZone.classList.remove("dragover");
            onFiles(Array.from(event.dataTransfer.files));
        });
        fileInput.addEventListener("change", event => {
            onFiles(Array.from(event.target.files));
            fileInput.value = "";
        });
    },

    async handleScheduleFile(file) {
        if (!file) return;
        const status = document.getElementById("scheduleStatus");
        try {
            status.textContent = "Reading file";
            status.className = "status loading";
            const schedule = await window.FileHandler.readJSON(file);
            window.ScheduleRandomizer.validate(schedule);
            this.state.source = [...schedule];
            this.state.result = [...schedule];
            this.state.resultIsOriginal = true;
            this.state.scheduleFileName = file.name;
            status.textContent = `Loaded 52 weeks from ${file.name}`;
            status.className = "status success";
            document.getElementById("mainPanel").style.display = "block";
            document.getElementById("resultPanel").style.display = "block";
            document.getElementById("resultHeading").textContent = "Current Schedule";
            document.getElementById("reportBox").textContent = "Original schedule loaded.";
            this.renderSchedule(this.state.result);
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    handleTrackFiles(files) {
        const status = document.getElementById("trackStatus");
        const trackFiles = files.filter(file => file.name.toLowerCase().endsWith(".json"));
        if (!trackFiles.length) {
            status.textContent = "Choose one or more .json track files";
            status.className = "status error";
            return;
        }

        const namesByKey = new Map(this.state.tracks.map(name => [name.toLowerCase(), name]));
        for (const file of trackFiles) {
            const name = file.name.replace(/\.json$/i, "");
            if (name) namesByKey.set(name.toLowerCase(), name);
        }
        this.state.tracks = [...namesByKey.values()];
        status.textContent = `Loaded ${this.state.tracks.length} track names; JSON contents are ignored.`;
        status.className = "status success";
        this.renderTracks();
        this.updateButtonStates();
    },

    renderTracks() {
        const list = document.getElementById("trackList");
        list.replaceChildren();
        for (const name of this.state.tracks) {
            const item = document.createElement("li");
            item.textContent = name;
            list.appendChild(item);
        }
        if (this.state.tracks.length) {
            const countInput = document.getElementById("trackCount");
            countInput.value = Math.min(this.state.tracks.length, 52);
        }
    },

    bindActions() {
        document.getElementById("shuffleBtn").addEventListener("click", () => this.runShuffle());
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
    },

    getWeekRange() {
        const openingWeek = document.getElementById("openingWeek").valueAsNumber;
        const finaleWeek = document.getElementById("finaleWeek").valueAsNumber;
        if (!Number.isInteger(openingWeek) || !Number.isInteger(finaleWeek) ||
            openingWeek < 1 || finaleWeek > 52 || openingWeek > finaleWeek) {
            throw new Error("Enter a valid week range from 1 to 52");
        }
        return { openingWeek, finaleWeek };
    },

    runShuffle() {
        if (!this.state.source) return;
        try {
            const { openingWeek, finaleWeek } = this.getWeekRange();
            this.state.result = window.ScheduleRandomizer.shuffle(this.state.result, openingWeek, finaleWeek);
            this.showResult("Shuffled Schedule", `Shuffled weeks ${openingWeek}-${finaleWeek}.`);
        } catch (error) {
            this.showToast(error.message, "error");
        }
    },

    runRandomize() {
        if (!this.state.source) return;
        try {
            const { openingWeek, finaleWeek } = this.getWeekRange();
            const count = document.getElementById("trackCount").valueAsNumber;
            const availableWeeks = finaleWeek - openingWeek + 1;
            if (!Number.isInteger(count) || count < 1 || count > this.state.tracks.length || count > availableWeeks) {
                throw new Error(`Choose between 1 and ${Math.min(this.state.tracks.length, availableWeeks)} tracks`);
            }
            this.state.result = window.ScheduleRandomizer.randomize(
                this.state.result,
                this.state.tracks,
                count,
                openingWeek,
                finaleWeek
            );
            this.showResult("Randomized Schedule", `Placed ${count} distinct tracks in weeks ${openingWeek}-${finaleWeek}.`);
        } catch (error) {
            this.showToast(error.message, "error");
        }
    },

    showResult(heading, report) {
        this.state.resultIsOriginal = false;
        document.getElementById("resultHeading").textContent = heading;
        document.getElementById("reportBox").textContent = report;
        this.renderSchedule(this.state.result);
        this.updateButtonStates();
        this.showToast("Schedule updated", "success");
    },

    renderSchedule(schedule) {
        const container = document.getElementById("resultTable");
        const rows = schedule.map((track, index) => `<tr><td class="week-cell">${index + 1}</td><td>${this.escape(track || "-")}</td></tr>`).join("");
        container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Week</th><th>Track</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },

    escape(value) {
        const element = document.createElement("div");
        element.textContent = String(value);
        return element.innerHTML;
    },

    downloadResult() {
        if (!this.state.result) return;
        const prefix = this.state.resultIsOriginal ? "original_" : "randomized_";
        const fileName = prefix + this.state.scheduleFileName;
        window.FileHandler.downloadJSON(this.state.result, fileName);
        this.showToast(`Downloaded ${fileName}`, "success");
    },

    resetAll() {
        if (!this.state.source) return;
        this.state.result = [...this.state.source];
        this.state.resultIsOriginal = true;
        document.getElementById("resultHeading").textContent = "Current Schedule";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderSchedule(this.state.result);
        this.updateButtonStates();
        this.showToast("Restored original schedule", "success");
    },

    updateButtonStates() {
        const hasSchedule = !!this.state.source;
        document.getElementById("shuffleBtn").disabled = !hasSchedule;
        document.getElementById("randomizeBtn").disabled = !hasSchedule || this.state.tracks.length === 0;
        document.getElementById("resetBtn").disabled = !hasSchedule;
        document.getElementById("downloadBtn").disabled = !hasSchedule;
    },

    showToast(message, type) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.className = `toast show ${type || ""}`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { toast.className = "toast"; }, 5000);
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
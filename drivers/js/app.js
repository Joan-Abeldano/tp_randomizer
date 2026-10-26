const App = {
    state: {
        drivers: [],
        result: null,
        resultIsOriginal: false,
        fileName: "drivers.json"
    },

    init() {
        this.bindUpload();
        this.bindOptions();
        this.bindActions();
        this.renderAgeBrackets();
    },

    bindUpload() {
        const dropZone = document.getElementById("dropZone");
        const fileInput = document.getElementById("fileInput");

        dropZone.addEventListener("click", () => fileInput.click());

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });
    },

    async handleFile(file) {
        const status = document.getElementById("uploadStatus");
        try {
            status.textContent = "Reading file";
            status.className = "status loading";
            const data = await window.FileHandler.readJSON(file);
            if (!Array.isArray(data)) {
                throw new Error("JSON root must be an array of drivers");
            }
            this.state.drivers = data;
            this.state.fileName = file.name;
            this.state.result = null;
            this.state.resultIsOriginal = false;
            status.textContent = `Loaded ${data.length} drivers from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (err) {
            status.textContent = "Error: " + err.message;
            status.className = "status error";
        }
    },

    bindOptions() {
        const statOptions = ["optDefaultStats", "optPerAge", "optOverallStats"];
        statOptions.forEach(optionId => {
            const option = document.getElementById(optionId);
            option.addEventListener("change", () => {
                if (!option.checked) return;
                statOptions.filter(id => id !== optionId)
                    .forEach(id => { document.getElementById(id).checked = false; });
                document.getElementById("ageBracketsSection").style.display =
                    document.getElementById("optPerAge").checked ? "block" : "none";
            });
        });

        const perAge = document.getElementById("optPerAge");
        const ageSection = document.getElementById("ageBracketsSection");
        perAge.addEventListener("change", () => {
            ageSection.style.display = perAge.checked ? "block" : "none";
        });

        const randomizeTalent = document.getElementById("optTalent");
        const randomizeTalentNear = document.getElementById("optTalentNear");
        randomizeTalent.addEventListener("change", () => {
            if (randomizeTalent.checked) randomizeTalentNear.checked = false;
        });
        randomizeTalentNear.addEventListener("change", () => {
            if (randomizeTalentNear.checked) randomizeTalent.checked = false;
        });

        const addBracketBtn = document.getElementById("addBracketBtn");
        addBracketBtn.addEventListener("click", () => {
            window.AgeConfig.addBracket();
            this.renderAgeBrackets();
        });

        const resetBracketsBtn = document.getElementById("resetBracketsBtn");
        resetBracketsBtn.addEventListener("click", () => {
            window.AgeConfig.reset();
            this.renderAgeBrackets();
        });
    },

    bindActions() {
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("showResultTable").addEventListener("change", (event) => {
            document.getElementById("resultTable").hidden = !event.target.checked;
        });
    },

    renderAgeBrackets() {
        const container = document.getElementById("ageBrackets");
        container.innerHTML = "";
        const brackets = window.AgeConfig.getAll();

        brackets.forEach((b, idx) => {
            const row = document.createElement("div");
            row.className = "bracket-row";

            row.innerHTML = `
                <div class="bracket-range">
                    <label>Age</label>
                    <input type="number" value="${b.min}" data-field="min" data-idx="${idx}" min="0" max="120">
                    <span>-</span>
                    <input type="number" value="${b.max}" data-field="max" data-idx="${idx}" min="0" max="120">
                </div>
                <div class="bracket-stat">
                    <label>Stats</label>
                    <input type="number" value="${b.stats.min}" data-field="statsMin" data-idx="${idx}" min="1" max="20">
                    <span>-</span>
                    <input type="number" value="${b.stats.max}" data-field="statsMax" data-idx="${idx}" min="1" max="20">
                </div>
                <button class="btn-remove" data-idx="${idx}" ${brackets.length <= 1 ? "disabled" : ""}>x</button>
            `;

            container.appendChild(row);
        });

        container.querySelectorAll("input").forEach(input => {
            input.addEventListener("change", (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                const val = parseInt(e.target.value) || 0;
                const bracket = window.AgeConfig.getAll()[idx];
                if (!bracket) return;
                switch (field) {
                    case "min": bracket.min = val; break;
                    case "max": bracket.max = val; break;
                    case "statsMin": bracket.stats.min = val; break;
                    case "statsMax": bracket.stats.max = val; break;
                }
            });
        });

        container.querySelectorAll(".btn-remove").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.dataset.idx);
                window.AgeConfig.removeBracket(idx);
                this.renderAgeBrackets();
            });
        });
    },

    collectOptions() {
        return {
            defaultStats: document.getElementById("optDefaultStats").checked,
            statsMin: document.getElementById("statsMin").valueAsNumber,
            statsMax: document.getElementById("statsMax").valueAsNumber,
            perAgeStats: document.getElementById("optPerAge").checked,
            overallStats: document.getElementById("optOverallStats").checked,
            overallMin: document.getElementById("overallMin").valueAsNumber,
            overallMax: document.getElementById("overallMax").valueAsNumber,
            randomizeTraits: document.getElementById("optTraits").checked,
            randomizePersonalities: document.getElementById("optPersonalities").checked,
            zeroHistory: document.getElementById("optZeroHistory").checked,
            randomizeBalance: document.getElementById("optBalance").checked,
            balanceMin: document.getElementById("balanceMin").valueAsNumber,
            balanceMax: document.getElementById("balanceMax").valueAsNumber,
            randomizeTraction: document.getElementById("optTraction").checked,
            tractionMin: document.getElementById("tractionMin").valueAsNumber,
            tractionMax: document.getElementById("tractionMax").valueAsNumber,
            randomizeTalent: document.getElementById("optTalent").checked,
            talentMin: document.getElementById("talentMin").valueAsNumber,
            talentMax: document.getElementById("talentMax").valueAsNumber,
            randomizeTalentNear: document.getElementById("optTalentNear").checked,
            talentVariation: Number.parseInt(document.getElementById("talentVariation").value, 10) || 0,
            clearContracts: document.getElementById("optClearContracts").checked
        };
    },

    runRandomize() {
        const options = this.collectOptions();
        if (!this.state.drivers.length) return;
        const customRanges = [
            [options.defaultStats, options.statsMin, options.statsMax, window.GameData.STAT_MIN, window.GameData.STAT_MAX, "stats"],
            [options.randomizeBalance, options.balanceMin, options.balanceMax, window.GameData.PREF_MIN, window.GameData.PREF_MAX, "balance_preference"],
            [options.randomizeTraction, options.tractionMin, options.tractionMax, window.GameData.PREF_MIN, window.GameData.PREF_MAX, "traction_preference"],
            [options.randomizeTalent, options.talentMin, options.talentMax, window.GameData.TALENT_MIN, window.GameData.TALENT_MAX, "talent"]
        ];
        const invalidRange = customRanges.find(([enabled, min, max, allowedMin, allowedMax]) => enabled && (
            !Number.isInteger(min) ||
            !Number.isInteger(max) ||
            min < allowedMin ||
            max > allowedMax ||
            min > max
        ));
        if (invalidRange) {
            this.showToast(`Enter a valid ${invalidRange[5]} range from ${invalidRange[3]} to ${invalidRange[4]}`, "error");
            return;
        }
        if (options.overallStats && (
            !Number.isInteger(options.overallMin) ||
            !Number.isInteger(options.overallMax) ||
            options.overallMin < window.GameData.STATS_FIELDS.length * window.GameData.STAT_MIN ||
            options.overallMax > window.GameData.STATS_FIELDS.length * window.GameData.STAT_MAX ||
            options.overallMin > options.overallMax
        )) {
            this.showToast("Enter a valid overall range from 5 to 100", "error");
            return;
        }
        if (!Object.values(options).some(value => typeof value === "boolean" && value)) {
            this.showToast("Select at least one randomization option", "error");
            return;
        }
        try {
            const sourceDrivers = this.state.result || this.state.drivers;
            const { drivers, report } = window.Randomizer.process(sourceDrivers, options, this.state.drivers);
            this.state.result = drivers;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Result";
            this.renderDriversTable(drivers, "resultTable");
            this.showPanel("resultPanel");
            this.updateButtonStates();
            const changes = [
                [report.statsRandomized, "age-based stats randomized"],
                [report.defaultStats, `stats randomized (${options.statsMin}-${options.statsMax})`],
                [report.overallStatsRandomized, `overalls randomized (${options.overallMin}-${options.overallMax})`],
                [report.traitsRandomized, "trait sets randomized"],
                [report.personalitiesRandomized, "personalities randomized"],
                [report.historyZeroed, "history records zeroed"],
                [report.balanceRandomized, `balance preferences randomized (${options.balanceMin}-${options.balanceMax})`],
                [report.tractionRandomized, `traction preferences randomized (${options.tractionMin}-${options.tractionMax})`],
                [report.talentRandomized, `talent values randomized (${options.talentMin}-${options.talentMax})`],
                [report.contractsCleared, "contracts cleared"]
            ].filter(([count]) => count > 0)
                .map(([count, label]) => `${count} ${label}`);
            const summary = changes.length ? `Changes: ${changes.join(", ")}` : "No driver changes were made.";
            this.showToast(
                `Randomization complete\n${report.processed} of ${report.total} drivers processed\n${summary}`,
                "success"
            );
        } catch (err) {
            this.showToast("Error: " + err.message, "error");
        }
    },

    renderDriversTable(drivers, targetId) {
        const container = document.getElementById(targetId);
        if (!drivers.length) {
            container.innerHTML = "<p class='empty'>No drivers</p>";
            return;
        }
        const limit = Math.min(drivers.length, 50);
        const rows = drivers.slice(0, limit).map(d => {
            const age = d.age ?? "-";
            const corner = d.cornering ?? "-";
            const braking = d.braking ?? "-";
            const cons = d.consistency ?? "-";
            const smooth = d.smoothness ?? "-";
            const ctrl = d.control ?? "-";
            const talent = d.talent ?? "-";
            const bal = d.balance_preference ?? "-";
            const trac = d.traction_preference ?? "-";
            const traits = (d.traits || []).join(", ") || "-";
            const pers = (d.personalities || []).join(", ") || "-";
            return `<tr>
                <td>${this.escape(d.name || "-")}</td>
                <td>${age}</td>
                <td>${this.escape(d.team || "-")}</td>
                <td>${corner}</td><td>${braking}</td><td>${cons}</td>
                <td>${smooth}</td><td>${ctrl}</td>
                <td>${talent}</td>
                <td>${bal}</td><td>${trac}</td>
                <td>${this.escape(traits)}</td>
                <td>${this.escape(pers)}</td>
            </tr>`;
        }).join("");
        container.innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th><th>Age</th><th>Team</th>
                            <th>Cor</th><th>Brk</th><th>Con</th><th>Smo</th><th>Ctl</th>
                            <th>Talent</th>
                            <th>Bal</th><th>Trac</th>
                            <th>Traits</th><th>Personalities</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            ${drivers.length > limit ? `<p class="hint">Showing first ${limit} of ${drivers.length} drivers</p>` : ""}
        `;
    },

    downloadResult() {
        if (!this.state.result) return;
        const prefix = this.state.resultIsOriginal ? "original_" : "randomized_";
        const name = prefix + this.state.fileName;
        window.FileHandler.downloadJSON(this.state.result, name);
        this.showToast(`Downloaded ${name}`, "success");
    },

    resetAll() {
        if (!this.state.drivers.length) return;
        this.state.result = JSON.parse(JSON.stringify(this.state.drivers));
        this.state.resultIsOriginal = true;
        document.getElementById("resultHeading").textContent = "Original Drivers";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderDriversTable(this.state.result, "resultTable");
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original driver data", "success");
    },

    showPanel(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
    },

    hidePanel(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    },

    updateButtonStates() {
        const hasDrivers = this.state.drivers.length > 0;
        const hasResult = !!this.state.result;
        document.getElementById("randomizeBtn").disabled = !hasDrivers;
        document.getElementById("downloadBtn").disabled = !hasResult;
        document.getElementById("resetBtn").disabled = !hasDrivers;
    },

    escape(text) {
        if (text === null || text === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(text);
        return div.innerHTML;
    },

    showToast(msg, type) {
        const toast = document.getElementById("toast");
        toast.textContent = msg;
        toast.className = "toast show " + (type || "");
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.className = "toast";
        }, 5000);
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());

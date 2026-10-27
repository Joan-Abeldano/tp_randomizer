const App = {
    state: {
        teams: [],
        result: null,
        resultIsOriginal: false,
        fileName: "teams.json"
    },

    init() {
        this.renderEqualTeamFields();
        this.bindUpload();
        this.bindOptions();
        this.bindActions();
    },

    renderEqualTeamFields() {
        const container = document.getElementById("equalTeamFields");
        container.innerHTML = window.TeamData.fields.map((field, index) => `
            <label class="equal-team-field" for="equalStat${index}">
                <span>${this.escape(field.label)}</span>
                <input type="number" id="equalStat${index}" min="1" max="100" step="0.1" value="50" required>
            </label>
        `).join("");
    },

    bindOptions() {
        [["randomizeStats", "randomizeStatsRange", "statsNearOriginal"], ["randomizePotential", "potentialNearOriginal"]]
            .forEach(optionIds => {
                optionIds.forEach(optionId => {
                    const option = document.getElementById(optionId);
                    option.addEventListener("change", () => {
                        if (!option.checked) return;
                        document.getElementById("setTeamsEqual").checked = false;
                        document.getElementById("equalTeamOptions").hidden = true;
                        optionIds.filter(id => id !== optionId)
                            .forEach(id => { document.getElementById(id).checked = false; });
                    });
                });
            });
        document.getElementById("setTeamsEqual").addEventListener("change", event => {
            document.getElementById("equalTeamOptions").hidden = !event.target.checked;
            if (event.target.checked) {
                ["randomizeStats", "randomizeStatsRange", "statsNearOriginal", "randomizePotential", "potentialNearOriginal"]
                    .forEach(id => { document.getElementById(id).checked = false; });
            }
        });
    },

    bindUpload() {
        const dropZone = document.getElementById("dropZone");
        const fileInput = document.getElementById("fileInput");

        dropZone.addEventListener("click", () => fileInput.click());
        dropZone.addEventListener("dragover", event => {
            event.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
        dropZone.addEventListener("drop", event => {
            event.preventDefault();
            dropZone.classList.remove("dragover");
            const file = event.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });
        fileInput.addEventListener("change", event => {
            const file = event.target.files[0];
            if (file) this.handleFile(file);
        });
    },

    async handleFile(file) {
        const status = document.getElementById("uploadStatus");
        try {
            status.textContent = "Reading file";
            status.className = "status loading";
            const teams = await window.FileHandler.readJSON(file);
            window.TeamData.validate(teams);
            this.state.teams = teams;
            this.state.result = null;
            this.state.resultIsOriginal = false;
            this.state.fileName = file.name;
            this.setEqualTeamDefaults(teams[0]);
            status.textContent = `Loaded ${teams.length} teams from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    setEqualTeamDefaults(team) {
        window.TeamData.fields.forEach((field, index) => {
            const value = window.TeamRandomizer.getValue(team, field.stat);
            if (typeof value === "number" && Number.isFinite(value)) {
                document.getElementById(`equalStat${index}`).value = value;
            }
        });
    },

    bindActions() {
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
        document.getElementById("showResultTable").addEventListener("change", event => {
            document.getElementById("resultTable").hidden = !event.target.checked;
        });
    },

    collectOptions() {
        return {
            randomizeStats: document.getElementById("randomizeStats").checked,
            randomizeStatsRange: document.getElementById("randomizeStatsRange").checked,
            statsRangeMin: Number(document.getElementById("statsRangeMin").value),
            statsRangeMax: Number(document.getElementById("statsRangeMax").value),
            statsNearOriginal: document.getElementById("statsNearOriginal").checked,
            statsVariation: Number.parseInt(document.getElementById("statsVariation").value, 10) || 0,
            setTeamsEqual: document.getElementById("setTeamsEqual").checked,
            equalStats: Object.fromEntries(window.TeamData.fields.map((field, index) => [
                field.stat.join("."),
                document.getElementById(`equalStat${index}`).valueAsNumber
            ])),
            randomizePotential: document.getElementById("randomizePotential").checked,
            potentialNearOriginal: document.getElementById("potentialNearOriginal").checked,
            potentialVariation: Number.parseInt(document.getElementById("potentialVariation").value, 10) || 0,
            randomizeFinance: document.getElementById("randomizeFinance").checked,
            randomizeHeadquarters: document.getElementById("randomizeHeadquarters").checked,
            randomizeActiveTeams: document.getElementById("randomizeActiveTeams").checked,
            activeTeamCount: document.getElementById("activeTeamCount").valueAsNumber
        };
    },

    runRandomize() {
        const options = this.collectOptions();
        if (options.setTeamsEqual && Object.values(options.equalStats).some(value =>
            !Number.isFinite(value) || value < 1 || value > 100
        )) {
            this.showToast("Enter a valid value from 1 to 100 for every team attribute", "error");
            return;
        }
        if (options.randomizeActiveTeams && (
            !Number.isInteger(options.activeTeamCount) ||
            options.activeTeamCount < 0 ||
            options.activeTeamCount > this.state.teams.length
        )) {
            this.showToast(`Enter a valid active team count from 0 to ${this.state.teams.length}`, "error");
            return;
        }
        if (options.randomizeStatsRange && (
            !Number.isInteger(options.statsRangeMin) ||
            !Number.isInteger(options.statsRangeMax) ||
            options.statsRangeMin < 1 ||
            options.statsRangeMax > 100 ||
            options.statsRangeMin > options.statsRangeMax
        )) {
            this.showToast("Enter a valid stat range from 1 to 100", "error");
            return;
        }
        if (!Object.values(options).some(value => typeof value === "boolean" && value)) {
            this.showToast("Select at least one randomization option", "error");
            return;
        }

        try {
            const source = this.state.result || this.state.teams;
            const { teams, report } = window.TeamRandomizer.process(source, options, this.state.teams);
            this.state.result = teams;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Teams";
            this.renderTeamsTable(teams);
            this.showReport(report);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    showReport(report) {
        const labels = {
            stats: "stats",
            potential: "starting potential values",
            potentialAdjusted: "potential values raised to match stats",
            budgets: "budgets",
            balances: "starting balances",
            headquarters: "headquarters values"
        };
        const summary = Object.entries(report)
            .filter(([group, count]) => group !== "activeTeams" && group !== "equalized" && count > 0)
            .map(([group, count]) => `${count} ${labels[group]}`);
        if (report.equalized) {
            summary.unshift(`${report.equalized} attributes set equally across ${this.state.teams.length} teams`);
        }
        if (report.activeTeams !== null) {
            summary.push(`${report.activeTeams} of ${this.state.teams.length} teams set active`);
        }
        document.getElementById("reportBox").textContent = summary.length
            ? `Randomized ${summary.join(", ")} across ${this.state.teams.length} teams.`
            : "No numeric fields were available for the selected groups.";
        this.showToast("Team randomization complete", "success");
    },

    renderTeamsTable(teams) {
        const container = document.getElementById("resultTable");
        if (!teams.length) {
            container.innerHTML = "<p class='empty'>No teams</p>";
            return;
        }
        const rows = teams.map(team => {
            const headquarters = Object.values(team.headquarters || {}).reduce((total, value) => total + (Number(value) || 0), 0);
            return `<tr>
                <td>${this.escape(team.name)}</td>
                <td>${team.active ? "Active" : "Inactive"}</td>
                <td>${this.escape(team.team_pace ?? "-")}</td>
                <td>${this.escape(team.braking ?? "-")}</td>
                <td>${this.escape(team.acceleration ?? "-")}</td>
                <td>${this.escape(this.formatMillions(team.budget_m))}</td>
                <td>${this.escape(this.formatMillions(team.starting_balance_m))}</td>
                <td>${this.escape(team.prestige_base ?? "-")}</td>
                <td>${headquarters}</td>
                <td>${this.escape(team.difficulty ?? "-")}</td>
            </tr>`;
        }).join("");
        container.innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Team</th><th>Status</th><th>Pace</th><th>Braking</th><th>Acceleration</th>
                        <th>Budget (M)</th><th>Balance (M)</th><th>Prestige</th><th>HQ levels</th><th>Difficulty</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    formatMillions(value) {
        return typeof value === "number" ? value.toFixed(1) : "-";
    },

    downloadResult() {
        if (!this.state.result) return;
        const prefix = this.state.resultIsOriginal ? "original_" : "randomized_";
        const name = prefix + this.state.fileName;
        window.FileHandler.downloadJSON(this.state.result, name);
        this.showToast(`Downloaded ${name}`, "success");
    },

    resetAll() {
        if (!this.state.teams.length) return;
        this.state.result = JSON.parse(JSON.stringify(this.state.teams));
        this.state.resultIsOriginal = true;
        document.getElementById("resultHeading").textContent = "Original Teams";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderTeamsTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original team data", "success");
    },

    updateButtonStates() {
        const hasTeams = this.state.teams.length > 0;
        document.getElementById("randomizeBtn").disabled = !hasTeams;
        document.getElementById("resetBtn").disabled = !hasTeams;
        document.getElementById("downloadBtn").disabled = !this.state.result;
    },

    showPanel(id) {
        const panel = document.getElementById(id);
        if (panel) panel.style.display = "block";
    },

    escape(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    },

    showToast(message, type) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.className = `toast show ${type || ""}`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.className = "toast";
        }, 5000);
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
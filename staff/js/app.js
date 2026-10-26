const App = {
    state: {
        staff: [],
        result: null,
        resultIsOriginal: false,
        fileName: "staff.json"
    },

    init() {
        this.bindUpload();
        this.bindActions();
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
            const staff = await window.FileHandler.readJSON(file);
            if (!Array.isArray(staff) || staff.some(person => !person || typeof person !== "object" || Array.isArray(person))) {
                throw new Error("JSON root must be an array of staff objects");
            }
            this.state.staff = staff;
            this.state.result = null;
            this.state.resultIsOriginal = false;
            this.state.fileName = file.name;
            status.textContent = `Loaded ${staff.length} staff records from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
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
            randomizeSkills: document.getElementById("randomizeSkills").checked,
            skillsMin: document.getElementById("skillsMin").valueAsNumber,
            skillsMax: document.getElementById("skillsMax").valueAsNumber,
            randomizeTalent: document.getElementById("randomizeTalent").checked,
            talentMin: document.getElementById("talentMin").valueAsNumber,
            talentMax: document.getElementById("talentMax").valueAsNumber,
            randomizeOverallSkill: document.getElementById("randomizeOverallSkill").checked,
            overallSkillMin: document.getElementById("overallSkillMin").valueAsNumber,
            overallSkillMax: document.getElementById("overallSkillMax").valueAsNumber,
            clearContracts: document.getElementById("clearContracts").checked
        };
    },

    runRandomize() {
        const options = this.collectOptions();
        if (!this.state.staff.length) return;
        const ranges = [
            [options.randomizeSkills, options.skillsMin, options.skillsMax, "skills"],
            [options.randomizeTalent, options.talentMin, options.talentMax, "talent"],
            [options.randomizeOverallSkill, options.overallSkillMin, options.overallSkillMax, "overall skill"]
        ];
        const invalidRange = ranges.find(([enabled, min, max]) => enabled && (
            !Number.isInteger(min) ||
            !Number.isInteger(max) ||
            min < 1 ||
            max > 20 ||
            min > max
        ));
        if (invalidRange) {
            this.showToast(`Enter a valid ${invalidRange[3]} range from 1 to 20`, "error");
            return;
        }
        if (![options.randomizeSkills, options.randomizeTalent, options.randomizeOverallSkill, options.clearContracts].some(Boolean)) {
            this.showToast("Select at least one randomization option", "error");
            return;
        }

        try {
            const source = this.state.result || this.state.staff;
            const { staff, report } = window.StaffRandomizer.process(source, options);
            this.state.result = staff;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Staff";
            this.renderStaffTable(staff);
            this.showReport(report, options);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    showReport(report, options) {
        const changes = [
            [report.skills, `staff skill sets randomized (${options.skillsMin}-${options.skillsMax})`],
            [report.talent, `staff talent sets randomized (${options.talentMin}-${options.talentMax})`],
            [report.overallSkill, `overall skill ratings randomized (${options.overallSkillMin}-${options.overallSkillMax})`],
            [report.contractsCleared, "staff contracts cleared"]
        ].filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`);
        const summary = changes.length ? `Changes: ${changes.join(", ")}` : "No matching staff fields were available for the selected options.";
        document.getElementById("reportBox").textContent = `${report.processed} staff records processed. ${summary}`;
        this.showToast("Staff randomization complete", "success");
    },

    renderStaffTable(staff) {
        const container = document.getElementById("resultTable");
        if (!staff.length) {
            container.innerHTML = "<p class='empty'>No staff records</p>";
            return;
        }
        const rows = staff.map(person => `<tr>
            <td>${this.escape(person.name || "-")}</td>
            <td>${this.escape(person.role || "-")}</td>
            <td>${this.escape(person.team || "-")}</td>
            <td>${this.escape(person.skill ?? "-")}</td>
            <td>${this.formatFields(person.skills)}</td>
            <td>${this.formatFields(person.talent)}</td>
            <td>${this.escape(person.contract?.team ?? "-")}</td>
        </tr>`).join("");
        container.innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Name</th><th>Role</th><th>Team</th><th>Overall</th>
                        <th>Skills</th><th>Talent</th><th>Contract team</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    formatFields(fields) {
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "-";
        return Object.entries(fields)
            .map(([key, value]) => `${this.escape(key)}: ${this.escape(value)}`)
            .join("<br>");
    },

    escape(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    },

    downloadResult() {
        if (!this.state.result) return;
        const prefix = this.state.resultIsOriginal ? "original_" : "randomized_";
        const name = prefix + this.state.fileName;
        window.FileHandler.downloadJSON(this.state.result, name);
        this.showToast(`Downloaded ${name}`, "success");
    },

    resetAll() {
        if (!this.state.staff.length) return;
        this.state.result = JSON.parse(JSON.stringify(this.state.staff));
        this.state.resultIsOriginal = true;
        document.getElementById("resultHeading").textContent = "Original Staff";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderStaffTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original staff data", "success");
    },

    updateButtonStates() {
        const hasStaff = this.state.staff.length > 0;
        document.getElementById("randomizeBtn").disabled = !hasStaff;
        document.getElementById("resetBtn").disabled = !hasStaff;
        document.getElementById("downloadBtn").disabled = !this.state.result;
    },

    showPanel(id) {
        const panel = document.getElementById(id);
        if (panel) panel.style.display = "block";
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

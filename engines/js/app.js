const App = {
    state: {
        source: null,
        result: null,
        resultIsOriginal: false,
        fileName: "engines.json"
    },

    fields: [
        { key: "power_rating", option: "randomizePower", minInput: "powerMin", maxInput: "powerMax", minOption: "powerMin", maxOption: "powerMax", label: "power rating", precision: 0, limit: 100 },
        { key: "reliability_rating", option: "randomizeReliability", minInput: "reliabilityMin", maxInput: "reliabilityMax", minOption: "reliabilityMin", maxOption: "reliabilityMax", label: "reliability rating", precision: 0, limit: 100 },
        { key: "fuel_efficiency", option: "randomizeFuelEfficiency", minInput: "fuelEfficiencyMin", maxInput: "fuelEfficiencyMax", minOption: "fuelEfficiencyMin", maxOption: "fuelEfficiencyMax", label: "fuel efficiency", precision: 0, limit: 100 },
        { key: "mass_kg", option: "randomizeMass", minInput: "massMin", maxInput: "massMax", minOption: "massMin", maxOption: "massMax", label: "mass", precision: 1 },
        { key: "cost_m", option: "randomizeCost", minInput: "costMin", maxInput: "costMax", minOption: "costMin", maxOption: "costMax", label: "cost", precision: 1 }
    ],

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

    validateData(data) {
        if (!data || typeof data !== "object" || Array.isArray(data) ||
            !data.suppliers || typeof data.suppliers !== "object" || Array.isArray(data.suppliers)) {
            throw new Error("JSON must contain a suppliers object");
        }
        if (Object.values(data.suppliers).some(supplier => !supplier || typeof supplier !== "object" || Array.isArray(supplier))) {
            throw new Error("Every supplier must be an object");
        }
    },

    async handleFile(file) {
        const status = document.getElementById("uploadStatus");
        try {
            status.textContent = "Reading file";
            status.className = "status loading";
            const data = await window.FileHandler.readJSON(file);
            this.validateData(data);
            this.state.source = data;
            this.state.result = null;
            this.state.resultIsOriginal = false;
            this.state.fileName = file.name;
            this.setDataDefaults(data);
            status.textContent = `Loaded ${Object.keys(data.suppliers).length} suppliers from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    setDataDefaults(data) {
        for (const field of this.fields.filter(item => item.key === "mass_kg" || item.key === "cost_m")) {
            const values = Object.values(data.suppliers)
                .map(supplier => supplier[field.key])
                .filter(value => typeof value === "number" && Number.isFinite(value));
            const minInput = document.getElementById(field.minInput);
            const maxInput = document.getElementById(field.maxInput);
            if (!values.length) {
                minInput.value = "";
                maxInput.value = "";
                continue;
            }
            minInput.value = Math.min(...values);
            maxInput.value = Math.max(...values);
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
        const options = {};
        for (const field of this.fields) {
            options[field.option] = document.getElementById(field.option).checked;
            options[field.minOption] = document.getElementById(field.minInput).valueAsNumber;
            options[field.maxOption] = document.getElementById(field.maxInput).valueAsNumber;
        }
        return options;
    },

    runRandomize() {
        if (!this.state.source) return;
        const options = this.collectOptions();
        const selected = this.fields.filter(field => options[field.option]);
        if (!selected.length) {
            this.showToast("Select at least one attribute to randomize", "error");
            return;
        }

        for (const field of selected) {
            const min = options[field.minOption];
            const max = options[field.maxOption];
            const maxAllowed = field.limit ?? Number.POSITIVE_INFINITY;
            const scale = 10 ** field.precision;
            if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > maxAllowed || min > max ||
                Math.abs(min * scale - Math.round(min * scale)) > 1e-8 ||
                Math.abs(max * scale - Math.round(max * scale)) > 1e-8) {
                this.showToast(`Enter a valid ${field.label} range`, "error");
                return;
            }
        }

        try {
            const { data, report } = window.EngineRandomizer.process(this.state.result || this.state.source, options);
            this.state.result = data;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Engines";
            this.renderTable(data);
            this.showReport(report, options);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    showReport(report, options) {
        const changes = this.fields
            .filter(field => report[field.key] > 0)
            .map(field => `${report[field.key]} suppliers ${field.label} randomized (${options[field.minOption]}-${options[field.maxOption]})`);
        document.getElementById("reportBox").textContent = changes.length
            ? `Changes: ${changes.join(", ")}`
            : "No supplier fields were available for the selected attributes.";
        this.showToast("Engine randomization complete", "success");
    },

    renderTable(data) {
        const container = document.getElementById("resultTable");
        const suppliers = Object.entries(data.suppliers);
        if (!suppliers.length) {
            container.innerHTML = "<p class='empty'>No suppliers</p>";
            return;
        }
        const rows = suppliers.map(([name, supplier]) => `<tr>
            <td>${this.escape(name)}</td>
            <td>${this.escape(supplier.engine ?? "-")}</td>
            <td>${this.formatValue(supplier.power_rating)}</td>
            <td>${this.formatValue(supplier.reliability_rating)}</td>
            <td>${this.formatValue(supplier.fuel_efficiency)}</td>
            <td>${this.formatValue(supplier.mass_kg)}</td>
            <td>${this.formatValue(supplier.cost_m)}</td>
        </tr>`).join("");
        container.innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>Supplier</th><th>Engine</th><th>Power</th><th>Reliability</th>
                        <th>Fuel efficiency</th><th>Mass (kg)</th><th>Cost (M)</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    formatValue(value) {
        return typeof value === "number" && Number.isFinite(value) ? this.escape(value) : "-";
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
        if (!this.state.source) return;
        this.state.result = JSON.parse(JSON.stringify(this.state.source));
        this.state.resultIsOriginal = true;
        document.getElementById("resultHeading").textContent = "Original Engines";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original engine data", "success");
    },

    updateButtonStates() {
        const hasData = !!this.state.source;
        document.getElementById("randomizeBtn").disabled = !hasData;
        document.getElementById("resetBtn").disabled = !hasData;
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

const App = {
    state: {
        source: null,
        result: null,
        resultIsOriginal: false,
        fileName: "parts.json"
    },

    fields: [
        { key: "base_wear_per_lap", option: "randomizeWear", minInput: "wearMin", maxInput: "wearMax", minOption: "wearMin", maxOption: "wearMax", label: "base wear per lap", precision: 4, scope: "category" },
        { key: "fail_prob_per_lap_over_50_wear", option: "randomizeFailure", minInput: "failureMin", maxInput: "failureMax", minOption: "failureMin", maxOption: "failureMax", label: "failure probability", precision: 4, scope: "category" },
        { key: "pace_rating", option: "randomizePace", minInput: "paceMin", maxInput: "paceMax", minOption: "paceMin", maxOption: "paceMax", label: "pace rating", precision: 0, limit: 100, scope: "supplier" },
        { key: "reliability_rating", option: "randomizeReliability", minInput: "reliabilityMin", maxInput: "reliabilityMax", minOption: "reliabilityMin", maxOption: "reliabilityMax", label: "reliability rating", precision: 0, limit: 100, scope: "supplier" },
        { key: "budget_m", option: "randomizeBudget", minInput: "budgetMin", maxInput: "budgetMax", minOption: "budgetMin", maxOption: "budgetMax", label: "supplier budget", precision: 1, scope: "supplier" },
        { key: "dev_weights.pace", reportKey: "dev_weights", option: "randomizeWeights", minInput: "weightsMin", maxInput: "weightsMax", minOption: "weightsMin", maxOption: "weightsMax", label: "pace development weight", precision: 2, limit: 1, scope: "weights" },
        { key: "allocation_per_season", option: "randomizeAllocation", minInput: "allocationMin", maxInput: "allocationMax", minOption: "allocationMin", maxOption: "allocationMax", label: "seasonal allocation", precision: 0, scope: "supplier" },
        { key: "max_customers", option: "randomizeCustomers", minInput: "customersMin", maxInput: "customersMax", minOption: "customersMin", maxOption: "customersMax", label: "maximum customers", precision: 0, scope: "supplier" },
        { key: "years", option: "randomizeContractYears", minInput: "contractYearsMin", maxInput: "contractYearsMax", minOption: "contractYearsMin", maxOption: "contractYearsMax", label: "contract years", precision: 0, scope: "contract", minimum: 1 },
        { key: "parts_per_season", option: "randomizePartsPerSeason", minInput: "partsPerSeasonMin", maxInput: "partsPerSeasonMax", minOption: "partsPerSeasonMin", maxOption: "partsPerSeasonMax", label: "parts per season", precision: 0, scope: "contract" }
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
            fileInput.value = "";
        });
    },

    validateData(data) {
        if (!data || typeof data !== "object" || Array.isArray(data) ||
            !data.categories || typeof data.categories !== "object" || Array.isArray(data.categories) ||
            !data.default_contracts || typeof data.default_contracts !== "object" || Array.isArray(data.default_contracts)) {
            throw new Error("JSON must contain categories and default_contracts objects");
        }
        for (const category of Object.values(data.categories)) {
            if (!category || typeof category !== "object" || Array.isArray(category) ||
                !category.suppliers || typeof category.suppliers !== "object" || Array.isArray(category.suppliers)) {
                throw new Error("Every category must contain a suppliers object");
            }
        }
        for (const teamContracts of Object.values(data.default_contracts)) {
            if (!teamContracts || typeof teamContracts !== "object" || Array.isArray(teamContracts) ||
                Object.values(teamContracts).some(contract => !contract || typeof contract !== "object" || Array.isArray(contract))) {
                throw new Error("Every team contract entry must be an object");
            }
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
            this.renderPartChoices(data);
            this.setRangeDefaults(data);
            status.textContent = `Loaded ${Object.keys(data.categories).length} part categories and ${Object.keys(data.default_contracts).length} teams from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    renderPartChoices(data) {
        const container = document.getElementById("partCategoryChoices");
        container.replaceChildren();
        for (const [key, category] of Object.entries(data.categories)) {
            const label = document.createElement("label");
            label.className = "part-choice";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.value = key;
            input.checked = true;
            input.addEventListener("change", () => this.updateAllPartsCheckbox());
            const text = document.createElement("span");
            text.textContent = category.label || key;
            label.append(input, text);
            container.appendChild(label);
        }
        document.getElementById("allParts").checked = true;
    },

    updateAllPartsCheckbox() {
        const choices = [...document.querySelectorAll("#partCategoryChoices input[type=checkbox]")];
        document.getElementById("allParts").checked = choices.length > 0 && choices.every(input => input.checked);
    },

    valuesForField(data, field) {
        if (field.scope === "category") {
            return Object.values(data.categories).map(category => category[field.key]);
        }
        if (field.scope === "supplier") {
            return Object.values(data.categories).flatMap(category =>
                Object.values(category.suppliers).map(supplier => supplier[field.key])
            );
        }
        if (field.scope === "weights") {
            return Object.values(data.categories).flatMap(category =>
                Object.values(category.suppliers).map(supplier => supplier.dev_weights?.pace)
            );
        }
        return Object.values(data.default_contracts).flatMap(teamContracts =>
            Object.values(teamContracts).map(contract => contract[field.key])
        );
    },

    setRangeDefaults(data) {
        for (const field of this.fields) {
            const values = this.valuesForField(data, field)
                .filter(value => typeof value === "number" && Number.isFinite(value));
            const minInput = document.getElementById(field.minInput);
            const maxInput = document.getElementById(field.maxInput);
            if (!values.length) {
                minInput.value = "";
                maxInput.value = "";
            } else {
                minInput.value = Math.min(...values);
                maxInput.value = Math.max(...values);
            }
        }
    },

    bindActions() {
        document.getElementById("allParts").addEventListener("change", event => {
            document.querySelectorAll("#partCategoryChoices input[type=checkbox]")
                .forEach(input => { input.checked = event.target.checked; });
        });
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
        document.getElementById("showResultTable").addEventListener("change", event => {
            document.getElementById("resultTable").hidden = !event.target.checked;
        });
    },

    collectOptions() {
        const options = {
            randomizeContractSuppliers: document.getElementById("randomizeContractSuppliers").checked,
            randomizeContractTypes: document.getElementById("randomizeContractTypes").checked,
            selectedCategories: [...document.querySelectorAll("#partCategoryChoices input[type=checkbox]:checked")]
                .map(input => input.value)
        };
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
        if (!options.selectedCategories.length) {
            this.showToast("Select at least one part category", "error");
            return;
        }
        if (!selected.length && !options.randomizeContractSuppliers && !options.randomizeContractTypes) {
            this.showToast("Select at least one stat or contract option to randomize", "error");
            return;
        }
        for (const field of selected) {
            const min = options[field.minOption];
            const max = options[field.maxOption];
            const scale = 10 ** field.precision;
            if (!Number.isFinite(min) || !Number.isFinite(max) || min < (field.minimum ?? 0) ||
                max > (field.limit ?? Number.POSITIVE_INFINITY) || min > max ||
                Math.abs(min * scale - Math.round(min * scale)) > 1e-8 ||
                Math.abs(max * scale - Math.round(max * scale)) > 1e-8) {
                this.showToast(`Enter a valid ${field.label} range`, "error");
                return;
            }
        }

        try {
            const { data } = window.PartsRandomizer.process(this.state.result || this.state.source, options);
            this.state.result = data;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Parts";
            this.renderTable(data);
            this.showToast("Parts randomization complete", "success");
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    renderTable(data) {
        const categoryRows = Object.entries(data.categories).map(([key, category]) => `<tr>
            <td>${this.escape(category.label ?? key)}</td>
            <td>${this.formatValue(category.base_wear_per_lap)}</td>
            <td>${this.formatValue(category.fail_prob_per_lap_over_50_wear)}</td>
        </tr>`).join("");
        const supplierRows = Object.entries(data.categories).flatMap(([key, category]) =>
            Object.entries(category.suppliers || {}).map(([name, supplier]) => `<tr>
                <td>${this.escape(category.label ?? key)}</td>
                <td>${this.escape(name)}</td>
                <td>${this.formatValue(supplier.pace_rating)}</td>
                <td>${this.formatValue(supplier.reliability_rating)}</td>
                <td>${this.formatValue(supplier.budget_m)}</td>
                <td>${this.formatValue(supplier.dev_weights?.pace)} / ${this.formatValue(supplier.dev_weights?.reliability)}</td>
                <td>${this.formatValue(supplier.allocation_per_season)}</td>
                <td>${this.formatValue(supplier.max_customers)}</td>
            </tr>`)
        ).join("");
        const contractRows = Object.entries(data.default_contracts).flatMap(([team, contracts]) =>
            Object.entries(contracts).map(([categoryKey, contract]) => `<tr>
                <td>${this.escape(team)}</td>
                <td>${this.escape(data.categories[categoryKey]?.label ?? categoryKey)}</td>
                <td>${this.escape(contract.supplier ?? "-")}</td>
                <td>${this.formatValue(contract.years)}</td>
                <td>${this.escape(contract.type ?? "-")}</td>
                <td>${this.formatValue(contract.parts_per_season)}</td>
            </tr>`)
        ).join("");

        document.getElementById("resultTable").innerHTML = `
            <h3>Category Stats</h3>
            <div class="table-wrap"><table><thead><tr><th>Category</th><th>Base wear per lap</th><th>Failure probability</th></tr></thead><tbody>${categoryRows}</tbody></table></div>
            <h3>Supplier Stats</h3>
            <div class="table-wrap"><table><thead><tr><th>Category</th><th>Supplier</th><th>Pace</th><th>Reliability</th><th>Budget (M)</th><th>Dev weights (pace / reliability)</th><th>Allocation</th><th>Max customers</th></tr></thead><tbody>${supplierRows}</tbody></table></div>
            <h3>Default Contracts</h3>
            <div class="table-wrap"><table><thead><tr><th>Team</th><th>Category</th><th>Supplier</th><th>Years</th><th>Type</th><th>Parts per season</th></tr></thead><tbody>${contractRows}</tbody></table></div>
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
        document.getElementById("resultHeading").textContent = "Original Parts";
        this.renderTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original parts data", "success");
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
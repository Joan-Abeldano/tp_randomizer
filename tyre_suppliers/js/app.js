const App = {
    state: {
        source: null,
        result: null,
        resultIsOriginal: false,
        fileName: "tyre_suppliers.json"
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
            fileInput.value = "";
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
            this.renderOptions(data);
            status.textContent = `Loaded ${Object.keys(data.suppliers).length} tyre suppliers from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    valuesForField(data, field) {
        return Object.values(data.suppliers).flatMap(supplier =>
            field.paths.map(path => window.TyreSupplierRandomizer.getPath(supplier, path))
                .filter(value => typeof value === "number" && Number.isFinite(value))
        );
    },

    renderOptions(data) {
        const container = document.getElementById("optionsGrid");
        container.replaceChildren();
        const suppliers = Object.values(data.suppliers);
        const statusCheckbox = document.getElementById("randomizeSupplierStatus");
        const activeCountInput = document.getElementById("activeSupplierCount");
        activeCountInput.min = "0";
        activeCountInput.max = String(suppliers.length);
        activeCountInput.value = String(suppliers.filter(supplier => supplier.active).length);
        activeCountInput.disabled = !statusCheckbox.checked;
        document.getElementById("supplierCount").textContent = `of ${suppliers.length} suppliers`;

        const categories = new Map();
        for (const field of window.TyreSupplierRandomizer.fields) {
            const values = this.valuesForField(data, field);
            if (!values.length) continue;

            let category = categories.get(field.category);
            if (!category) {
                const section = document.createElement("section");
                section.className = "stat-category";
                const heading = document.createElement("h3");
                heading.textContent = field.category;
                const grid = document.createElement("div");
                grid.className = "options-grid";
                section.append(heading, grid);
                container.appendChild(section);
                category = { grid };
                categories.set(field.category, category);
            }

            const label = document.createElement("label");
            label.className = "opt range-opt";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `randomize_${field.id}`;
            const name = document.createElement("span");
            name.textContent = field.label;
            const from = document.createElement("span");
            from.textContent = "from";
            const minInput = this.createRangeInput(field, "Min", "Minimum");
            const to = document.createElement("span");
            to.textContent = "to";
            const maxInput = this.createRangeInput(field, "Max", "Maximum");
            minInput.value = Math.min(...values);
            maxInput.value = Math.max(...values);
            label.append(checkbox, name, from, minInput, to, maxInput);
            category.grid.appendChild(label);
        }
    },

    createRangeInput(field, bound, accessibleBound) {
        const input = document.createElement("input");
        input.type = "number";
        input.id = `${field.id}${bound}`;
        input.step = String(10 ** -field.precision);
        if (Number.isFinite(field.minLimit)) input.min = String(field.minLimit);
        if (Number.isFinite(field.maxLimit)) input.max = String(field.maxLimit);
        input.setAttribute("aria-label", `${accessibleBound} ${field.label.toLowerCase()}`);
        return input;
    },

    bindActions() {
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
        document.getElementById("randomizeSupplierStatus").addEventListener("change", event => {
            document.getElementById("activeSupplierCount").disabled = !event.target.checked;
        });
        document.getElementById("showResultTable").addEventListener("change", event => {
            document.getElementById("resultTable").hidden = !event.target.checked;
        });
    },

    collectOptions() {
        const options = {
            randomizeSupplierStatus: document.getElementById("randomizeSupplierStatus").checked,
            activeSupplierCount: document.getElementById("activeSupplierCount").valueAsNumber
        };
        for (const field of window.TyreSupplierRandomizer.fields) {
            const checkbox = document.getElementById(`randomize_${field.id}`);
            if (!checkbox) continue;
            options[`randomize_${field.id}`] = checkbox.checked;
            options[`${field.id}Min`] = document.getElementById(`${field.id}Min`).valueAsNumber;
            options[`${field.id}Max`] = document.getElementById(`${field.id}Max`).valueAsNumber;
        }
        return options;
    },

    runRandomize() {
        if (!this.state.source) return;
        const options = this.collectOptions();
        const selected = window.TyreSupplierRandomizer.fields.filter(field => options[`randomize_${field.id}`]);
        if (!selected.length && !options.randomizeSupplierStatus) {
            this.showToast("Select at least one supplier stat or enable status randomization", "error");
            return;
        }
        const supplierCount = Object.keys(this.state.source.suppliers).length;
        if (options.randomizeSupplierStatus && (!Number.isInteger(options.activeSupplierCount) ||
            options.activeSupplierCount < 0 || options.activeSupplierCount > supplierCount)) {
            this.showToast(`Enter an active supplier count from 0 to ${supplierCount}`, "error");
            return;
        }
        for (const field of selected) {
            const min = options[`${field.id}Min`];
            const max = options[`${field.id}Max`];
            const scale = 10 ** field.precision;
            if (!Number.isFinite(min) || !Number.isFinite(max) || min > max ||
                (Number.isFinite(field.minLimit) && min < field.minLimit) ||
                (Number.isFinite(field.maxLimit) && max > field.maxLimit) ||
                Math.abs(min * scale - Math.round(min * scale)) > 1e-8 ||
                Math.abs(max * scale - Math.round(max * scale)) > 1e-8) {
                this.showToast(`Enter a valid ${field.label.toLowerCase()} range`, "error");
                return;
            }
        }

        try {
            const { data, report } = window.TyreSupplierRandomizer.process(this.state.result || this.state.source, options);
            this.state.result = data;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Tyre Suppliers";
            this.renderTable(data);
            this.showReport(report, options);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    showReport(report, options) {
        const changes = window.TyreSupplierRandomizer.fields
            .filter(field => report[field.id] > 0)
            .map(field => `${report[field.id]} ${field.label.toLowerCase()} values randomized (${options[`${field.id}Min`]}-${options[`${field.id}Max`]})`);
        if (options.randomizeSupplierStatus) {
            const supplierCount = Object.keys(this.state.result.suppliers).length;
            changes.push(`Supplier statuses randomized (${report.activeSuppliers} active, ${supplierCount - report.activeSuppliers} inactive)`);
        }
        document.getElementById("reportBox").textContent = changes.length
            ? `Changes: ${changes.join(", ")}`
            : "No matching supplier stats were available for the selected options.";
        this.showToast("Tyre supplier randomization complete", "success");
    },

    renderTable(data) {
        const rows = Object.entries(data.suppliers).map(([name, supplier]) => `<tr>
            <td>${this.escape(name)}</td>
            <td>${supplier.active ? "Active" : "Inactive"}</td>
            <td>${this.escape(supplier.nationality ?? "-")}</td>
            <td>${this.formatValue(supplier.join_chance)}</td>
            <td>${this.formatValue(supplier.leave_chance)}</td>
            <td>${this.formatObject(supplier.prices)}</td>
            <td>${this.formatObject(supplier.trend)}</td>
            <td>${this.formatObject(supplier.variance)}</td>
            <td>${this.formatRatings(supplier)}</td>
        </tr>`).join("");
        document.getElementById("resultTable").innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr><th>Supplier</th><th>Status</th><th>Nationality</th><th>Join chance</th><th>Leave chance</th><th>Prices</th><th>Trends</th><th>Variance</th><th>Compound ratings</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
        `;
    },

    formatObject(value) {
        if (!value || typeof value !== "object") return "-";
        return `<code>${this.escape(JSON.stringify(value))}</code>`;
    },

    formatRatings(supplier) {
        const ratings = Object.fromEntries(["lateral_grip", "longitudinal_grip", "durability", "temperature_tolerance"]
            .filter(key => supplier[key] && typeof supplier[key] === "object")
            .map(key => [key, supplier[key]]));
        return this.formatObject(ratings);
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
        document.getElementById("resultHeading").textContent = "Original Tyre Suppliers";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original tyre supplier data", "success");
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
const App = {
    state: {
        source: null,
        result: null,
        resultIsOriginal: false,
        fileName: "sponsors.json",
        paymentTiers: [],
        defaultTiers: []
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

    validateData(data) {
        if (!Array.isArray(data)) {
            throw new Error("JSON root must be an array of sponsors");
        }
        if (data.some(sponsor => !sponsor || typeof sponsor !== "object" || Array.isArray(sponsor))) {
            throw new Error("Every sponsor must be an object");
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
            this.setTierDefaults(data);
            this.renderPaymentTiers();
            status.textContent = `Loaded ${data.length} sponsors from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    setTierDefaults(sponsors) {
        const byRating = new Map();
        for (const sponsor of sponsors) {
            if (!Number.isInteger(sponsor.rating) || sponsor.rating < 1 || sponsor.rating > 10) continue;
            const range = Array.isArray(sponsor.amount_range_m) && sponsor.amount_range_m.length === 2
                ? sponsor.amount_range_m
                : [sponsor.amount_m, sponsor.amount_m];
            if (!range.every(value => Number.isFinite(value))) continue;
            if (!byRating.has(sponsor.rating)) byRating.set(sponsor.rating, []);
            byRating.get(sponsor.rating).push(range);
        }

        this.state.defaultTiers = Array.from({ length: 10 }, (_, index) => {
            const level = index + 1;
            const ranges = byRating.get(level) || [];
            return {
                level,
                min: ranges.length ? Math.min(...ranges.map(range => range[0])) : 0,
                max: ranges.length ? Math.max(...ranges.map(range => range[1])) : 0
            };
        });
        this.state.paymentTiers = this.state.defaultTiers.map(tier => ({ ...tier }));
    },

    bindActions() {
        document.getElementById("randomizeBtn").addEventListener("click", () => this.runRandomize());
        document.getElementById("resetBtn").addEventListener("click", () => this.resetAll());
        document.getElementById("downloadBtn").addEventListener("click", () => this.downloadResult());
        document.getElementById("showResultTable").addEventListener("change", event => {
            document.getElementById("resultTable").hidden = !event.target.checked;
        });
        document.getElementById("addTierBtn").addEventListener("click", () => this.addTier());
        document.getElementById("resetTiersBtn").addEventListener("click", () => {
            this.state.paymentTiers = this.state.defaultTiers.map(tier => ({ ...tier }));
            this.renderPaymentTiers();
        });
    },

    renderPaymentTiers() {
        const container = document.getElementById("paymentTiers");
        container.innerHTML = "";
        this.state.paymentTiers.forEach((tier, index) => {
            const row = document.createElement("div");
            row.className = "tier-row";
            row.innerHTML = `
                <label>Rating level <input type="number" value="${tier.level}" data-field="level" data-index="${index}" min="1" max="10" step="1" aria-label="Rating level"></label>
                <label>Min (M) <input type="number" value="${tier.min}" data-field="min" data-index="${index}" min="0" step="0.1" aria-label="Minimum payment in millions"></label>
                <label>Max (M) <input type="number" value="${tier.max}" data-field="max" data-index="${index}" min="0" step="0.1" aria-label="Maximum payment in millions"></label>
                <button class="btn-remove" data-index="${index}" aria-label="Remove rating level ${tier.level}" ${this.state.paymentTiers.length <= 1 ? "disabled" : ""}>x</button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll("input").forEach(input => {
            input.addEventListener("change", event => {
                const tier = this.state.paymentTiers[Number(event.target.dataset.index)];
                if (!tier) return;
                const value = event.target.valueAsNumber;
                tier[event.target.dataset.field] = value;
            });
        });
        container.querySelectorAll(".btn-remove").forEach(button => {
            button.addEventListener("click", event => {
                this.state.paymentTiers.splice(Number(event.currentTarget.dataset.index), 1);
                this.renderPaymentTiers();
            });
        });
    },

    addTier() {
        const usedLevels = new Set(this.state.paymentTiers.map(tier => tier.level));
        const defaults = this.state.defaultTiers.find(tier => !usedLevels.has(tier.level));
        if (!defaults) {
            this.showToast("All rating levels from 1 to 10 are already configured", "error");
            return;
        }
        this.state.paymentTiers.push({ ...defaults });
        this.renderPaymentTiers();
    },

    collectOptions() {
        return {
            randomizeRating: document.getElementById("randomizeRating").checked,
            randomizePayment: document.getElementById("randomizePayment").checked,
            amountRange: document.getElementById("amountRange").valueAsNumber,
            paymentTiers: this.state.paymentTiers.map(tier => ({ ...tier }))
        };
    },

    validateOptions(options) {
        if (!options.randomizeRating && !options.randomizePayment) {
            this.showToast("Select at least one attribute to randomize", "error");
            return false;
        }
        if (!options.randomizePayment) return true;
        if (!Number.isFinite(options.amountRange) || options.amountRange < 0 || !this.hasOneDecimal(options.amountRange)) {
            this.showToast("Enter a valid amount range width", "error");
            return false;
        }
        if (!options.paymentTiers.length) {
            this.showToast("Add at least one payment rating level", "error");
            return false;
        }

        const levels = new Set();
        for (const tier of options.paymentTiers) {
            if (!Number.isInteger(tier.level) || tier.level < 1 || tier.level > 10 || levels.has(tier.level) ||
                !Number.isFinite(tier.min) || !Number.isFinite(tier.max) || tier.min < 0 || tier.min > tier.max ||
                !this.hasOneDecimal(tier.min) || !this.hasOneDecimal(tier.max)) {
                this.showToast("Check that rating levels are unique and payment ranges are valid", "error");
                return false;
            }
            levels.add(tier.level);
        }
        return true;
    },

    hasOneDecimal(value) {
        return Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
    },

    runRandomize() {
        if (!this.state.source) return;
        const options = this.collectOptions();
        if (!this.validateOptions(options)) return;

        try {
            const { sponsors, report } = window.SponsorRandomizer.process(this.state.result || this.state.source, options);
            this.state.result = sponsors;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Sponsors";
            this.renderTable(sponsors);
            this.showReport(report, options);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    showReport(report, options) {
        const changes = [];
        if (report.rating) changes.push(`${report.rating} sponsor ratings randomized (1-10)`);
        if (report.amount_m) changes.push(`${report.amount_m} sponsor payments randomized by rating; amount ranges set to +/-${options.amountRange}M`);
        document.getElementById("reportBox").textContent = changes.length
            ? `Changes: ${changes.join(", ")}`
            : "No sponsor fields were available for the selected options.";
        this.showToast("Sponsor randomization complete", "success");
    },

    renderTable(sponsors) {
        const container = document.getElementById("resultTable");
        if (!sponsors.length) {
            container.innerHTML = "<p class='empty'>No sponsors</p>";
            return;
        }
        const rows = sponsors.map(sponsor => `<tr>
            <td>${this.escape(sponsor.name)}</td>
            <td>${this.formatValue(sponsor.rating)}</td>
            <td>${this.formatValue(sponsor.amount_m)}</td>
            <td>${Array.isArray(sponsor.amount_range_m) ? this.escape(sponsor.amount_range_m.join(" - ")) : "-"}</td>
            <td>${this.escape(sponsor.industry ?? "-")}</td>
            <td>${this.escape(sponsor.active ?? "-")}</td>
        </tr>`).join("");
        container.innerHTML = `<div class="table-wrap"><table>
            <thead><tr><th>Sponsor</th><th>Rating</th><th>Payment (M)</th><th>Amount range (M)</th><th>Industry</th><th>Active</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`;
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
        document.getElementById("resultHeading").textContent = "Original Sponsors";
        document.getElementById("reportBox").textContent = "Restored from the uploaded file.";
        this.renderTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original sponsor data", "success");
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
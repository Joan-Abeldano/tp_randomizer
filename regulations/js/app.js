const App = {
    state: {
        source: null,
        result: null,
        resultIsOriginal: false,
        fileName: "regulations.json"
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

    async handleFile(file) {
        const status = document.getElementById("uploadStatus");
        try {
            status.textContent = "Reading file";
            status.className = "status loading";
            const data = await window.FileHandler.readJSON(file);
            window.RegulationsRandomizer.validate(data);
            this.state.source = data;
            this.state.result = null;
            this.state.resultIsOriginal = false;
            this.state.fileName = file.name;
            this.renderOptions(data);
            status.textContent = `Loaded ${data.categories.length} categories from ${file.name}`;
            status.className = "status success";
            this.showPanel("mainPanel");
            document.getElementById("resultPanel").style.display = "none";
            this.updateButtonStates();
        } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.className = "status error";
        }
    },

    renderOptions(data) {
        const grid = document.getElementById("optionsGrid");
        grid.innerHTML = window.RegulationsRandomizer.fields.map(field => {
            const category = data.categories.find(item => item.key === field.category);
            const value = category[field.property];
            const choice = field.property === "default_severity"
                ? category.severities[value]
                : category.options.find(option => option.key === value);
            return `<label class="opt regulation-opt" for="randomize-${field.id}">
                <input type="checkbox" id="randomize-${field.id}" data-field="${field.id}">
                <span>${this.escape(field.label)}</span>
            </label>`;
        }).join("");
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
        return Object.fromEntries(window.RegulationsRandomizer.fields.map(field => [
            field.id,
            document.getElementById(`randomize-${field.id}`).checked
        ]));
    },

    runRandomize() {
        if (!this.state.source) return;
        const options = this.collectOptions();
        if (!Object.values(options).some(Boolean)) {
            this.showToast("Select at least one regulation setting to randomize", "error");
            return;
        }

        try {
            const { data } = window.RegulationsRandomizer.process(this.state.result || this.state.source, options);
            this.state.result = data;
            this.state.resultIsOriginal = false;
            document.getElementById("resultHeading").textContent = "Randomized Regulations";
            this.renderTable(data);
            this.showPanel("resultPanel");
            this.updateButtonStates();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, "error");
        }
    },

    renderTable(data) {
        const rows = window.RegulationsRandomizer.fields.map(field => {
            const category = data.categories.find(item => item.key === field.category);
            const value = category[field.property];
            return `<tr><td>${this.escape(field.label)}</td><td>${this.escape(value)}</td></tr>`;
        }).join("");
        document.getElementById("resultTable").innerHTML = `
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Setting</th><th>Value</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
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
        document.getElementById("resultHeading").textContent = "Original Regulations";
        this.renderTable(this.state.result);
        this.showPanel("resultPanel");
        this.updateButtonStates();
        this.showToast("Restored original regulation data", "success");
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
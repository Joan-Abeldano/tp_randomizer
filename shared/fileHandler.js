const FileHandler = {
    readJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    resolve(JSON.parse(event.target.result));
                } catch (error) {
                    reject(new Error("Invalid JSON file: " + error.message));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    },

    downloadJSON(data, filename = "randomized.json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        this.downloadBlob(blob, filename);
    },

    downloadText(text, filename = "output.txt") {
        const blob = new Blob([text], { type: "text/plain" });
        this.downloadBlob(blob, filename);
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

window.FileHandler = FileHandler;
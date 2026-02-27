"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const health_1 = __importDefault(require("./routes/health"));
const networks_1 = __importDefault(require("./routes/networks"));
const ipaddresses_1 = __importDefault(require("./routes/ipaddresses"));
const unifi_1 = __importDefault(require("./routes/unifi"));
const settings_1 = __importDefault(require("./routes/settings"));
const auditlog_1 = __importDefault(require("./routes/auditlog"));
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use("/api/health", health_1.default);
    app.use("/api/networks", networks_1.default);
    app.use("/api/ipaddresses", ipaddresses_1.default);
    app.use("/api/unifi", unifi_1.default);
    app.use("/api/settings", settings_1.default);
    app.use("/api/auditlog", auditlog_1.default);
    // Error handling middleware
    app.use((err, _req, res, _next) => {
        console.error("Error:", err);
        res.status(err.status || 500).json({
            error: err.message || "Internal server error"
        });
    });
    return app;
}

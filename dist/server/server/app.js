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
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use('/api/health', health_1.default);
    app.use('/api/networks', networks_1.default);
    app.use('/api/ipaddresses', ipaddresses_1.default);
    return app;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
const app_1 = require("./app");
const app = (0, app_1.createApp)();
const port = Number(process.env.API_PORT) || 3000;
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

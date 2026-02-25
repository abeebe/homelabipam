"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const port = process.env.PORT || 3000;
const app = (0, app_1.createApp)();
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

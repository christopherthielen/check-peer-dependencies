"use strict";
exports.__esModule = true;
exports.readJson = void 0;
var fs_1 = require("fs");
function readJson(filename) {
    return JSON.parse((0, fs_1.readFileSync)(filename).toString('utf-8'));
}
exports.readJson = readJson;

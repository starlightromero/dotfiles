"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectExecutable = void 0;
const which = require("which");
// rome-ignore resolver/notFound
const vscode_1 = require("vscode");
async function selectExecutable() {
    const hadolintExectuables = which.sync("hadolint", { nothrow: true, all: true });
    const selectedExectuable = await vscode_1.window.showQuickPick(hadolintExectuables);
    const config = vscode_1.workspace.getConfiguration("hadolint");
    return config.update("hadolintPath", selectedExectuable, true);
}
exports.selectExecutable = selectExecutable;
//# sourceMappingURL=select-executable.js.map
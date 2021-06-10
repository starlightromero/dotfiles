"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileSystemPath = void 0;
// Source: https://github.com/Microsoft/vscode-eslint/blob/master/server/src/eslintServer.ts#L269
function getFileSystemPath(uri) {
    let result = uri.fsPath;
    if (process.platform === "win32" && result.length >= 2 && result[1] === ":") {
        // Node by default uses an upper case drive letter and ESLint uses
        // === to compare pathes which results in the equal check failing
        // if the drive letter is lower case in th URI. Ensure upper case.
        return result[0].toUpperCase() + result.substr(1);
    }
    else {
        return result;
    }
}
exports.getFileSystemPath = getFileSystemPath;
//# sourceMappingURL=utils.js.map
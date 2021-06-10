"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lint = exports.processHadolintMessage = void 0;
const spawn = require("cross-spawn");
// source: https://github.com/AtomLinter/linter-hadolint/blob/master/lib/main.js#L45
function processHadolintMessage(message) {
    const patterns = [
        {
            // </path/to/file>:<line-number> <error-code> <message>
            regex: /(.+):(\d+) (\S+) (.+)/,
            cb: (m) => ({
                lineNumber: Number.parseInt(m[2]),
                rule: m[3],
                message: m[4],
            }),
        },
        {
            // </path/to/file> <error-code> <message>
            // specifying DL|SH so it won't break when the path to file has whitespaces
            regex: /(.+) ((?:DL|SH)\d+) (.+)/,
            cb: (m) => ({ lineNumber: 1, rule: m[2], message: m[3] }),
        },
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const pattern of patterns) {
        const match = message.match(pattern.regex);
        if (match) {
            return pattern.cb(match);
        }
    }
    return null;
}
exports.processHadolintMessage = processHadolintMessage;
function lint(file, executablePath, workspacePath) {
    let cwd = workspacePath || process.cwd();
    let { stdout, error } = spawn.sync(executablePath, [file], { cwd });
    if (error) {
        console.error(error);
        throw new Error("Cannot find hadolint from system $PATH. Please install hadolint.");
    }
    // Parse hadolint output
    const hadolintRawOutput = stdout.toString().split(/\r?\n/g).filter((result) => result !== (undefined || null || ""));
    let hadolintResults = hadolintRawOutput.map((each) => processHadolintMessage(each));
    return hadolintResults;
}
exports.lint = lint;
//# sourceMappingURL=hadolint.js.map
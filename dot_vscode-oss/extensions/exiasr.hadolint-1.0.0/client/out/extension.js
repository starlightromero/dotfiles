"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
// rome-ignore resolver/notFound
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const select_executable_1 = require("./command/select-executable");
let defaultClient;
let clients = new Map();
let _sortedWorkspaceFolders;
function sortedWorkspaceFolders() {
    if (_sortedWorkspaceFolders === void 0) {
        _sortedWorkspaceFolders = vscode_1.workspace.workspaceFolders
            ? vscode_1.workspace.workspaceFolders.map((folder) => {
                let result = folder.uri.toString();
                if (result.charAt(result.length - 1) !== "/") {
                    result = `${result}/`;
                }
                return result;
            }).sort((a, b) => {
                return a.length - b.length;
            })
            : [];
    }
    return _sortedWorkspaceFolders;
}
vscode_1.workspace.onDidChangeWorkspaceFolders(() => _sortedWorkspaceFolders = undefined);
function getOuterMostWorkspaceFolder(folder) {
    let sorted = sortedWorkspaceFolders();
    for (let element of sorted) {
        let uri = folder.uri.toString();
        if (uri.charAt(uri.length - 1) !== "/") {
            uri = `${uri}/`;
        }
        if (uri.startsWith(element)) {
            return vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.parse(element));
        }
    }
    return folder;
}
function activate(context) {
    let module = context.asAbsolutePath(path.join("server", "out", "server.js"));
    let outputChannel = vscode_1.window.createOutputChannel("hadolint");
    vscode_1.commands.registerCommand("hadolint.selectExecutable", select_executable_1.selectExecutable);
    function didOpenTextDocument(document) {
        // We are only interested in language mode text
        if (document.languageId !== "dockerfile" ||
            (document.uri.scheme !== "file" && document.uri.scheme !== "untitled")) {
            return;
        }
        let uri = document.uri;
        // Untitled files go to a default client.
        if (uri.scheme === "untitled" && !defaultClient) {
            let debugOptions = { execArgv: ["--nolazy", "--inspect=6010"] };
            let serverOptions = {
                run: { module, transport: node_1.TransportKind.ipc },
                debug: { module, transport: node_1.TransportKind.ipc, options: debugOptions },
            };
            let clientOptions = {
                documentSelector: [{ scheme: "untitled", language: "dockerfile" }],
                diagnosticCollectionName: "hadolint",
                outputChannel,
                synchronize: {
                    // Notify the server about file changes to '.clientrc files contained in the workspace
                    fileEvents: vscode_1.workspace.createFileSystemWatcher("**/.hadolint.yaml"),
                },
            };
            defaultClient = new node_1.LanguageClient("hadolint", "hadolint", serverOptions, clientOptions);
            defaultClient.start();
            return;
        }
        let folder = vscode_1.workspace.getWorkspaceFolder(uri);
        // Files outside a folder can't be handled. This might depend on the language.
        // Single file languages like JSON might handle files outside the workspace folders.
        if (!folder) {
            return;
        }
        // If we have nested workspace folders we only start a server on the outer most workspace folder.
        folder = getOuterMostWorkspaceFolder(folder);
        if (!clients.has(folder.uri.toString())) {
            let debugOptions = {
                execArgv: ["--nolazy", `--inspect=${6011 + clients.size}`],
            };
            let serverOptions = {
                run: { module, transport: node_1.TransportKind.ipc },
                debug: { module, transport: node_1.TransportKind.ipc, options: debugOptions },
            };
            let clientOptions = {
                documentSelector: [
                    {
                        scheme: "file",
                        language: "dockerfile",
                        pattern: `${folder.uri.fsPath}/**/*`,
                    },
                ],
                diagnosticCollectionName: "hadolint",
                workspaceFolder: folder,
                outputChannel,
                synchronize: {
                    // Notify the server about file changes to '.clientrc files contained in the workspace
                    fileEvents: vscode_1.workspace.createFileSystemWatcher("**/.hadolint.yaml"),
                },
            };
            let client = new node_1.LanguageClient("hadolint", "hadolint", serverOptions, clientOptions);
            client.start();
            clients.set(folder.uri.toString(), client);
        }
    }
    vscode_1.workspace.onDidOpenTextDocument(didOpenTextDocument);
    vscode_1.workspace.textDocuments.forEach(didOpenTextDocument);
    vscode_1.workspace.onDidChangeWorkspaceFolders((event) => {
        for (let folder of event.removed) {
            let client = clients.get(folder.uri.toString());
            if (client) {
                clients.delete(folder.uri.toString());
                client.stop();
            }
        }
    });
}
exports.activate = activate;
function deactivate() {
    let promises = [];
    if (defaultClient) {
        promises.push(defaultClient.stop());
    }
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
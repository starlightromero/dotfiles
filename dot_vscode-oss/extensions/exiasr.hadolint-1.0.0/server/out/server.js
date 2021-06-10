"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_uri_1 = require("vscode-uri");
const hadolintService = require("./service/hadolint");
const utils_1 = require("./utils");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const HadolintSeverity = {
    error: node_1.DiagnosticSeverity.Error,
    warning: node_1.DiagnosticSeverity.Warning,
    info: node_1.DiagnosticSeverity.Information,
    hint: node_1.DiagnosticSeverity.Hint,
};
// Creates the LSP connection
const connection = node_1.createConnection(node_1.ProposedFeatures.all);
// Create a manager for open text documents
let documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// The workspace folder this server is operating on
let workspaceFolder;
async function getSettings() {
    const result = await connection.workspace.getConfiguration({
        section: "hadolint",
    });
    return result;
}
async function validateTextDocument(textDocument) {
    const settings = await getSettings();
    connection.console.log(`[hadolint(${process.pid}) ${workspaceFolder}] Current settings: ${JSON.stringify(settings)}`);
    let diagnostics = [];
    let lines = textDocument.getText().split(/\r?\n/g);
    let dockerfilePath = utils_1.getFileSystemPath(vscode_uri_1.URI.parse(textDocument.uri));
    try {
        const hadolintResults = hadolintService.lint(dockerfilePath, settings.hadolintPath, utils_1.getFileSystemPath(vscode_uri_1.URI.parse(workspaceFolder)));
        // Format diagnostics
        hadolintResults.forEach((result, index) => {
            if (index > settings.maxNumberOfProblems) {
                return;
            }
            let diagnosic = {
                // rome-ignore lint/ts/noExplicitAny
                severity: HadolintSeverity[settings.outputLevel],
                range: {
                    start: { line: result.lineNumber - 1, character: 0 },
                    end: {
                        line: result.lineNumber - 1,
                        character: lines[result.lineNumber - 1].length,
                    },
                },
                message: `[hadolint] ${result.message} (${result.rule})`,
            };
            diagnostics.push(diagnosic);
        });
        // Send the computed diagnostics to VSCode.
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    catch (err) {
        connection.window.showErrorMessage(`hadolint: ${err.message}`);
    }
}
documents.onDidOpen((event) => {
    connection.console.log(`[hadolint(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`);
    validateTextDocument(event.document);
});
documents.onDidSave((event) => {
    validateTextDocument(event.document);
});
documents.listen(connection);
connection.onInitialize((params) => {
    workspaceFolder = params.rootUri;
    connection.console.log(`[hadolint(${process.pid}) ${workspaceFolder}] Started and initialize received`);
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: node_1.TextDocumentSyncKind.None,
            },
        },
    };
});
connection.onInitialized(() => {
    connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
});
connection.onDidChangeConfiguration(() => {
    documents.all().forEach(validateTextDocument);
});
connection.onDidChangeWatchedFiles(() => {
    connection.console.log(`[hadolint(${process.pid}) ${workspaceFolder}] Detected changes in watched files`);
    documents.all().forEach(validateTextDocument);
});
connection.listen();
//# sourceMappingURL=server.js.map
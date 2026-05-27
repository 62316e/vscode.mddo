"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const todoPattern = /^(\s*)\[([ +\-])\]/;
const nextStatus = {
    ' ': '+',
    '+': '-',
    '-': ' '
};
class TodoDecorationController {
    styles = [
        {
            status: ' ',
            decoration: vscode.window.createTextEditorDecorationType({ color: '#9ca3af' })
        },
        {
            status: '+',
            decoration: vscode.window.createTextEditorDecorationType({ color: '#22c55e' })
        },
        {
            status: '-',
            decoration: vscode.window.createTextEditorDecorationType({ color: '#f97316' })
        }
    ];
    refresh(editor) {
        if (editor.document.languageId !== 'markdown') {
            return;
        }
        const rangesByStatus = {
            ' ': [],
            '+': [],
            '-': []
        };
        for (let lineNumber = 0; lineNumber < editor.document.lineCount; lineNumber++) {
            const line = editor.document.lineAt(lineNumber);
            const match = todoPattern.exec(line.text);
            if (!match) {
                continue;
            }
            const status = match[2];
            const startCharacter = match[1].length;
            const endCharacter = Math.max(line.text.length, startCharacter + 3);
            rangesByStatus[status].push(new vscode.Range(lineNumber, startCharacter, lineNumber, endCharacter));
        }
        for (const style of this.styles) {
            editor.setDecorations(style.decoration, rangesByStatus[style.status]);
        }
    }
    refreshVisibleEditors() {
        for (const editor of vscode.window.visibleTextEditors) {
            this.refresh(editor);
        }
    }
    dispose() {
        for (const style of this.styles) {
            style.decoration.dispose();
        }
    }
}
function activate(context) {
    const controller = new TodoDecorationController();
    context.subscriptions.push(controller, vscode.commands.registerCommand('mdTodo.toggle', () => toggleTodoStatus()), vscode.window.onDidChangeActiveTextEditor(() => controller.refreshVisibleEditors()), vscode.window.onDidChangeVisibleTextEditors(() => controller.refreshVisibleEditors()), vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.visibleTextEditors.some(editor => editor.document === event.document)) {
            controller.refreshVisibleEditors();
        }
    }));
    controller.refreshVisibleEditors();
}
function deactivate() { }
function toggleTodoStatus() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        return;
    }
    const line = editor.document.lineAt(editor.selection.active.line);
    const match = todoPattern.exec(line.text);
    if (!match) {
        return;
    }
    const status = match[2];
    const startCharacter = match[1].length;
    const range = new vscode.Range(line.lineNumber, startCharacter, line.lineNumber, startCharacter + 3);
    editor.edit(editBuilder => {
        editBuilder.replace(range, `[${nextStatus[status]}]`);
    });
}
//# sourceMappingURL=extension.js.map
import * as vscode from 'vscode';

type TodoStatus = ' ' | '+' | '-';

interface TodoStyle {
    readonly status: TodoStatus;
    readonly decoration: vscode.TextEditorDecorationType;
}

const todoPattern = /^(\s*)\[([ +\-])\]/;
const nextStatus: Record<TodoStatus, TodoStatus> = {
    ' ': '+',
    '+': '-',
    '-': ' '
};

class TodoDecorationController {
    private readonly styles: readonly TodoStyle[] = [
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

    public refresh(editor: vscode.TextEditor): void {
        if (editor.document.languageId !== 'markdown') {
            return;
        }

        const rangesByStatus: Record<TodoStatus, vscode.Range[]> = {
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

            const status = match[2] as TodoStatus;
            const startCharacter = match[1].length;
            const endCharacter = Math.max(line.text.length, startCharacter + 3);
            rangesByStatus[status].push(new vscode.Range(lineNumber, startCharacter, lineNumber, endCharacter));
        }

        for (const style of this.styles) {
            editor.setDecorations(style.decoration, rangesByStatus[style.status]);
        }
    }

    public refreshVisibleEditors(): void {
        for (const editor of vscode.window.visibleTextEditors) {
            this.refresh(editor);
        }
    }

    public dispose(): void {
        for (const style of this.styles) {
            style.decoration.dispose();
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    const controller = new TodoDecorationController();

    context.subscriptions.push(
        controller,
        vscode.commands.registerCommand('mdTodo.toggle', () => toggleTodoStatus()),
        vscode.window.onDidChangeActiveTextEditor(() => controller.refreshVisibleEditors()),
        vscode.window.onDidChangeVisibleTextEditors(() => controller.refreshVisibleEditors()),
        vscode.workspace.onDidChangeTextDocument(event => {
            if (vscode.window.visibleTextEditors.some(editor => editor.document === event.document)) {
                controller.refreshVisibleEditors();
            }
        })
    );

    controller.refreshVisibleEditors();
}

export function deactivate() { }

function toggleTodoStatus(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== 'markdown') {
        return;
    }

    const line = editor.document.lineAt(editor.selection.active.line);
    const match = todoPattern.exec(line.text);

    if (!match) {
        return;
    }

    const status = match[2] as TodoStatus;
    const startCharacter = match[1].length;
    const range = new vscode.Range(line.lineNumber, startCharacter, line.lineNumber, startCharacter + 3);

    editor.edit(editBuilder => {
        editBuilder.replace(range, `[${nextStatus[status]}]`);
    });
}

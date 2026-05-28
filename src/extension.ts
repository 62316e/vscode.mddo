import * as vscode from 'vscode';

type TodoStatus = ' ' | '+' | '-';
export type DecorationScope = 'narrow' | 'wholeLine';

interface TodoStyle {
    readonly status: TodoStatus;
    readonly decoration: vscode.TextEditorDecorationType;
}

interface TodoMatch {
    readonly status: TodoStatus;
    readonly startCharacter: number;
}

const configurationSection = 'mddo';
const decorationScopeSetting = 'decorationScope';
const todoPattern = /^(\s*(?:(?:[-*+]|\d+[.)])\s+)?)\[([ +\-])\]/;
const todoStatuses: readonly TodoStatus[] = [' ', '+', '-'];
const nextStatus: Record<TodoStatus, TodoStatus> = {
    ' ': '+',
    '+': '-',
    '-': ' '
};
const colorSettings: Record<TodoStatus, string> = {
    ' ': 'colors.todo',
    '+': 'colors.completed',
    '-': 'colors.rejected'
};
const defaultColors: Record<TodoStatus, string> = {
    ' ': '#9ca3af',
    '+': '#22c55e',
    '-': '#f97316'
};

class TodoDecorationController {
    private styles: readonly TodoStyle[] = createTodoStyles();

    public refresh(editor: vscode.TextEditor): void {
        if (editor.document.languageId !== 'markdown') {
            return;
        }

        const rangesByStatus: Record<TodoStatus, vscode.Range[]> = {
            ' ': [],
            '+': [],
            '-': []
        };
        const decorationScope = getDecorationScope();

        for (let lineNumber = 0; lineNumber < editor.document.lineCount; lineNumber++) {
            const line = editor.document.lineAt(lineNumber);
            const match = parseTodoLine(line.text);

            if (!match) {
                continue;
            }

            const endCharacter = getDecorationRangeEnd(line.text, match.startCharacter, decorationScope);
            rangesByStatus[match.status].push(new vscode.Range(lineNumber, match.startCharacter, lineNumber, endCharacter));
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

    public refreshStyles(): void {
        this.disposeStyles();
        this.styles = createTodoStyles();
        this.refreshVisibleEditors();
    }

    public dispose(): void {
        this.disposeStyles();
    }

    private disposeStyles(): void {
        for (const style of this.styles) {
            style.decoration.dispose();
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    const controller = new TodoDecorationController();

    context.subscriptions.push(
        controller,
        vscode.commands.registerCommand('mddo.toggle', () => toggleTodoStatus()),
        vscode.window.onDidChangeActiveTextEditor(() => controller.refreshVisibleEditors()),
        vscode.window.onDidChangeVisibleTextEditors(() => controller.refreshVisibleEditors()),
        vscode.workspace.onDidChangeTextDocument(event => {
            if (vscode.window.visibleTextEditors.some(editor => editor.document === event.document)) {
                controller.refreshVisibleEditors();
            }
        }),
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(configurationSection)) {
                controller.refreshStyles();
            }
        })
    );

    controller.refreshVisibleEditors();
}

export function deactivate() { }

function getDecorationScope(): DecorationScope {
    return vscode.workspace
        .getConfiguration(configurationSection)
        .get<DecorationScope>(decorationScopeSetting, 'narrow');
}

function createTodoStyles(): readonly TodoStyle[] {
    return todoStatuses.map(status => ({
        status,
        decoration: vscode.window.createTextEditorDecorationType({
            color: getTodoColor(status),
            fontWeight: 'normal'
        })
    }));
}

function getTodoColor(status: TodoStatus): string {
    return vscode.workspace
        .getConfiguration(configurationSection)
        .get<string>(colorSettings[status], defaultColors[status]);
}

export function getDecorationRangeEnd(lineText: string, startCharacter: number, decorationScope: DecorationScope): number {
    return decorationScope === 'narrow'
        ? startCharacter + 3
        : Math.max(lineText.length, startCharacter + 3);
}

export function parseTodoLine(lineText: string): TodoMatch | undefined {
    const match = todoPattern.exec(lineText);

    if (!match) {
        return undefined;
    }

    return {
        status: match[2] as TodoStatus,
        startCharacter: match[1].length
    };
}

function toggleTodoStatus(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== 'markdown') {
        return;
    }

    const line = editor.document.lineAt(editor.selection.active.line);
    const match = parseTodoLine(line.text);

    if (!match) {
        return;
    }

    const range = new vscode.Range(line.lineNumber, match.startCharacter, line.lineNumber, match.startCharacter + 3);

    editor.edit(editBuilder => {
        editBuilder.replace(range, `[${nextStatus[match.status]}]`);
    });
}

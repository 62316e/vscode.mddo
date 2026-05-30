import * as vscode from 'vscode';

type TodoStatus = ' ' | '+' | '-';
export type DecorationScope = 'narrow' | 'wholeLine';

interface TodoStyle {
    readonly status: TodoStatus;
    readonly decoration: vscode.TextEditorDecorationType;
}

export interface TodoMatch {
    readonly status: TodoStatus;
    readonly startCharacter: number;
}

export interface TodoCounts {
    readonly open: number;
    readonly done: number;
    readonly rejected: number;
    readonly total: number;
}

export interface HeadingTodoCount {
    readonly lineNumber: number;
    readonly open: number;
}

export interface MarkdownHeading {
    readonly level: number;
}

interface ContentLine {
    readonly lineNumber: number;
    readonly text: string;
}

interface SummaryBlock {
    readonly startLine: number;
    readonly endLine: number;
}

interface ActiveHeading {
    readonly lineNumber: number;
    readonly level: number;
    open: number;
}

const configurationSection = 'mddo';
const decorationScopeSetting = 'decorationScope';
const headingCountsEnabledSetting = 'headingCounts.enabled';
const todoSummaryHeading = '## Todo Summary';
const todoPattern = /^(\s*(?:(?:[-*+]|\d+[.)])\s+)?)\[([ +\-])\]/;
const headingPattern = /^(#{1,6})\s+\S.*$/;
const fencedCodePattern = /^\s*(```|~~~)/;
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
    private readonly headingCountDecoration = vscode.window.createTextEditorDecorationType({
        after: {
            color: new vscode.ThemeColor('descriptionForeground'),
            fontWeight: 'normal',
            margin: '0 0 0 0.35em'
        }
    });

    public refresh(editor: vscode.TextEditor): void {
        if (editor.document.languageId !== 'markdown') {
            this.clear(editor);
            return;
        }

        const lineTexts = getDocumentLineTexts(editor.document);
        const contentLines = getContentLines(lineTexts);
        const rangesByStatus: Record<TodoStatus, vscode.Range[]> = {
            ' ': [],
            '+': [],
            '-': []
        };
        const decorationScope = getDecorationScope();

        for (const contentLine of contentLines) {
            const match = parseTodoLine(contentLine.text);

            if (!match) {
                continue;
            }

            const endCharacter = getDecorationRangeEnd(contentLine.text, match.startCharacter, decorationScope);
            rangesByStatus[match.status].push(new vscode.Range(contentLine.lineNumber, match.startCharacter, contentLine.lineNumber, endCharacter));
        }

        for (const style of this.styles) {
            editor.setDecorations(style.decoration, rangesByStatus[style.status]);
        }

        editor.setDecorations(this.headingCountDecoration, getHeadingCountDecorationOptions(editor, lineTexts));
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
        this.headingCountDecoration.dispose();
    }

    private clear(editor: vscode.TextEditor): void {
        for (const style of this.styles) {
            editor.setDecorations(style.decoration, []);
        }

        editor.setDecorations(this.headingCountDecoration, []);
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
        vscode.commands.registerCommand('mddo.updateSummary', () => updateTodoSummary()),
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

function getHeadingCountsEnabled(): boolean {
    return vscode.workspace
        .getConfiguration(configurationSection)
        .get<boolean>(headingCountsEnabledSetting, true);
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

function getDocumentLineTexts(document: vscode.TextDocument): readonly string[] {
    const lineTexts: string[] = [];

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
        lineTexts.push(document.lineAt(lineNumber).text);
    }

    return lineTexts;
}

function getContentLines(lineTexts: readonly string[]): readonly ContentLine[] {
    const contentLines: ContentLine[] = [];
    let isInFencedCodeBlock = false;

    for (let lineNumber = 0; lineNumber < lineTexts.length; lineNumber++) {
        const text = lineTexts[lineNumber];

        if (isFencedCodeBoundary(text)) {
            isInFencedCodeBlock = !isInFencedCodeBlock;
            continue;
        }

        if (!isInFencedCodeBlock) {
            contentLines.push({ lineNumber, text });
        }
    }

    return contentLines;
}

function isFencedCodeBoundary(lineText: string): boolean {
    return fencedCodePattern.test(lineText);
}

function getHeadingCountDecorationOptions(editor: vscode.TextEditor, lineTexts: readonly string[]): vscode.DecorationOptions[] {
    if (!getHeadingCountsEnabled()) {
        return [];
    }

    return collectHeadingTodoCounts(lineTexts).map(headingCount => {
        const line = editor.document.lineAt(headingCount.lineNumber);
        const range = new vscode.Range(headingCount.lineNumber, line.text.length, headingCount.lineNumber, line.text.length);

        return {
            range,
            renderOptions: {
                after: {
                    contentText: `(${headingCount.open})`
                }
            }
        };
    });
}

export function getDecorationRangeEnd(lineText: string, startCharacter: number, decorationScope: DecorationScope): number {
    return decorationScope === 'narrow'
        ? startCharacter + 3
        : Math.max(lineText.length, startCharacter + 3);
}

export function parseMarkdownHeading(lineText: string): MarkdownHeading | undefined {
    const match = headingPattern.exec(lineText);

    if (!match) {
        return undefined;
    }

    return { level: match[1].length };
}

export function collectTodoCounts(lineTexts: readonly string[]): TodoCounts {
    const counts = { open: 0, done: 0, rejected: 0, total: 0 };

    for (const contentLine of getContentLines(lineTexts)) {
        const match = parseTodoLine(contentLine.text);

        if (!match) {
            continue;
        }

        counts.total++;

        if (match.status === ' ') {
            counts.open++;
        } else if (match.status === '+') {
            counts.done++;
        } else {
            counts.rejected++;
        }
    }

    return counts;
}

export function collectHeadingTodoCounts(lineTexts: readonly string[]): readonly HeadingTodoCount[] {
    const headings: ActiveHeading[] = [];
    const activeHeadings: ActiveHeading[] = [];

    for (const contentLine of getContentLines(lineTexts)) {
        const heading = parseMarkdownHeading(contentLine.text);

        if (heading) {
            while (activeHeadings.length > 0 && activeHeadings[activeHeadings.length - 1].level >= heading.level) {
                activeHeadings.pop();
            }

            const activeHeading = { lineNumber: contentLine.lineNumber, level: heading.level, open: 0 };
            headings.push(activeHeading);
            activeHeadings.push(activeHeading);
            continue;
        }

        const todo = parseTodoLine(contentLine.text);

        if (todo?.status !== ' ') {
            continue;
        }

        for (const activeHeading of activeHeadings) {
            activeHeading.open++;
        }
    }

    return headings
        .filter(heading => heading.open > 0)
        .map(heading => ({ lineNumber: heading.lineNumber, open: heading.open }));
}

export function createTodoSummary(counts: TodoCounts): string {
    return [
        todoSummaryHeading,
        '',
        `- Open: ${counts.open}`,
        `- Done: ${counts.done}`,
        `- Rejected: ${counts.rejected}`,
        `- Total: ${counts.total}`
    ].join('\n');
}

export function findTodoSummaryBlock(lineTexts: readonly string[]): SummaryBlock | undefined {
    let isInFencedCodeBlock = false;

    for (let lineNumber = 0; lineNumber < lineTexts.length; lineNumber++) {
        const lineText = lineTexts[lineNumber];

        if (isFencedCodeBoundary(lineText)) {
            isInFencedCodeBlock = !isInFencedCodeBlock;
            continue;
        }

        if (isInFencedCodeBlock || lineText.trim() !== todoSummaryHeading) {
            continue;
        }

        return {
            startLine: lineNumber,
            endLine: findNextHeadingLine(lineTexts, lineNumber + 1) ?? lineTexts.length
        };
    }

    return undefined;
}

function findNextHeadingLine(lineTexts: readonly string[], startLine: number): number | undefined {
    let isInFencedCodeBlock = false;

    for (let lineNumber = startLine; lineNumber < lineTexts.length; lineNumber++) {
        const lineText = lineTexts[lineNumber];

        if (isFencedCodeBoundary(lineText)) {
            isInFencedCodeBlock = !isInFencedCodeBlock;
            continue;
        }

        if (!isInFencedCodeBlock && parseMarkdownHeading(lineText)) {
            return lineNumber;
        }
    }

    return undefined;
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

async function toggleTodoStatus(): Promise<void> {
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

    const didEdit = await editor.edit(editBuilder => {
        editBuilder.replace(range, `[${nextStatus[match.status]}]`);
    });

    if (didEdit) {
        await updateExistingTodoSummary(editor);
    }
}

async function updateTodoSummary(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== 'markdown') {
        return;
    }

    await writeTodoSummary(editor, true);
}

async function updateExistingTodoSummary(editor: vscode.TextEditor): Promise<void> {
    await writeTodoSummary(editor, false);
}

async function writeTodoSummary(editor: vscode.TextEditor, insertIfMissing: boolean): Promise<void> {
    const lineTexts = getDocumentLineTexts(editor.document);
    const existingBlock = findTodoSummaryBlock(lineTexts);

    if (!existingBlock && !insertIfMissing) {
        return;
    }

    const summary = createTodoSummary(collectTodoCounts(lineTexts));

    await editor.edit(editBuilder => {
        if (existingBlock) {
            const range = getSummaryBlockRange(editor.document, existingBlock);
            const suffix = existingBlock.endLine < editor.document.lineCount ? '\n\n' : '';
            editBuilder.replace(range, `${summary}${suffix}`);
            return;
        }

        const insertPosition = new vscode.Position(editor.selection.active.line, 0);
        editBuilder.insert(insertPosition, `${summary}\n\n`);
    });
}

function getSummaryBlockRange(document: vscode.TextDocument, summaryBlock: SummaryBlock): vscode.Range {
    const start = new vscode.Position(summaryBlock.startLine, 0);

    if (summaryBlock.endLine >= document.lineCount) {
        const lastLine = document.lineAt(document.lineCount - 1);
        return new vscode.Range(start, new vscode.Position(lastLine.lineNumber, lastLine.text.length));
    }

    return new vscode.Range(start, new vscode.Position(summaryBlock.endLine, 0));
}

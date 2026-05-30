import * as assert from 'assert';

import * as vscode from 'vscode';
import {
    collectHeadingTodoCounts,
    collectTodoCounts,
    createTodoSummary,
    findTodoSummaryBlock,
    getDecorationRangeEnd,
    parseMarkdownHeading,
    parseTodoLine
} from '../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('narrow decoration ends after the todo token', () => {
        assert.strictEqual(getDecorationRangeEnd('    [ ] todo **text**', 4, 'narrow'), 7);
    });

    test('whole-line decoration ends after the line text', () => {
        const lineText = '    [+] todo **text**';

        assert.strictEqual(getDecorationRangeEnd(lineText, 4, 'wholeLine'), lineText.length);
    });

    test('parses bare todo lines', () => {
        assert.deepStrictEqual(parseTodoLine('    [-] rejected'), { status: '-', startCharacter: 4 });
    });

    test('parses markdown task list todo lines', () => {
        assert.deepStrictEqual(parseTodoLine('  - [+] completed'), { status: '+', startCharacter: 4 });
    });

    test('parses markdown headings', () => {
        assert.deepStrictEqual(parseMarkdownHeading('## Auth service'), { level: 2 });
        assert.strictEqual(parseMarkdownHeading('not a heading'), undefined);
    });

    test('counts todos outside fenced code blocks', () => {
        assert.deepStrictEqual(collectTodoCounts([
            '## Auth service',
            '[ ] Login page',
            '```markdown',
            '[ ] example only',
            '```',
            '- [+] Token refresh',
            '[-] Legacy auth'
        ]), { open: 1, done: 1, rejected: 1, total: 3 });
    });

    test('collects open todo counts for active heading sections', () => {
        assert.deepStrictEqual(collectHeadingTodoCounts([
            '# Project',
            '## Auth service',
            '[ ] Login page',
            '### OAuth',
            '- [ ] Callback page',
            '## Billing',
            '[+] Invoice export'
        ]), [
            { lineNumber: 0, open: 2 },
            { lineNumber: 1, open: 2 },
            { lineNumber: 3, open: 1 }
        ]);
    });

    test('creates visible todo summary markdown', () => {
        assert.strictEqual(createTodoSummary({ open: 5, done: 12, rejected: 2, total: 19 }), [
            '## Todo Summary',
            '',
            '- Open: 5',
            '- Done: 12',
            '- Rejected: 2',
            '- Total: 19'
        ].join('\n'));
    });

    test('finds todo summary section range', () => {
        assert.deepStrictEqual(findTodoSummaryBlock([
            '# Notes',
            '',
            '## Todo Summary',
            '',
            '- Open: 5',
            '- Done: 12',
            '- Rejected: 2',
            '- Total: 19',
            '',
            '## Next section'
        ]), { startLine: 2, endLine: 9 });
    });
});

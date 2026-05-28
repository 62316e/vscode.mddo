import * as assert from 'assert';

import * as vscode from 'vscode';
import { getDecorationRangeEnd, parseTodoLine } from '../extension';

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
});

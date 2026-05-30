# mddo

Decorates lightweight Markdown todo statuses and lets you cycle them from the keyboard.

## Features

- `[ ]` todo markers are gray.
- `[+]` completed markers are green.
- `[-]` rejected markers are orange.
- `Toggle Markdown Todo Status` cycles the current line through `[ ]`, `[+]`, and `[-]`.
- `Insert/Update Todo Summary` writes a visible Markdown summary into the current file.
- Headings show open todo counts in the editor, such as `## Auth service (1)`, without changing the Markdown file.

## Usage

Open a Markdown file and write todo lines at the start of a line, optionally after indentation or a Markdown list marker:

```markdown
[ ] this is a todo line
[+] this is completed
[-] this is rejected
- [ ] this is a Markdown task list item
- [+] this Markdown task list item is completed
- [-] this Markdown task list item is rejected
```

Place the cursor on one of those lines and press `Alt+D`.

Run `Insert/Update Todo Summary` to add or refresh a visible summary block in the current Markdown file:

```markdown
## Todo Summary

- Open: 5
- Done: 12
- Rejected: 2
- Total: 19
```

After the summary exists, it refreshes automatically when you toggle a todo with `Alt+D`.

When a heading contains open todos, mddo also shows a virtual count at the end of the heading in VS Code. For example, a section like this:

```markdown
## Auth service

[ ] Login page
```

is displayed in the editor as `## Auth service (1)`, but the file still contains only `## Auth service`.

## Settings

`mddo.decorationScope` controls how much text is decorated:

- `narrow` decorates only the `[ ]`, `[+]`, or `[-]` marker. This is the default.
- `wholeLine` decorates from the marker through the end of the line.

Marker colors are configurable:

- `mddo.colors.todo` controls `[ ]` markers. Default: `#9ca3af`.
- `mddo.colors.completed` controls `[+]` markers. Default: `#22c55e`.
- `mddo.colors.rejected` controls `[-]` markers. Default: `#f97316`.
- `mddo.headingCounts.enabled` controls virtual open todo counts after headings. Default: `true`.

Example settings:

```json
{
	"mddo.decorationScope": "narrow",
	"mddo.colors.todo": "#9ca3af",
	"mddo.colors.completed": "#22c55e",
	"mddo.colors.rejected": "#f97316",
	"mddo.headingCounts.enabled": true
}
```

## Development

Run `npm run compile` to build the extension.

Press `F5` in VS Code to launch an Extension Development Host with the extension enabled.

## Local VSIX Install

Build a local package without publishing to the Marketplace:

```bash
npm install
npm run compile
npx @vscode/vsce package
```

Install the generated VSIX into your local VS Code profile:

```bash
code --install-extension ./mddo-0.0.3.vsix --force
```

Reload VS Code after installing. The extension will be available in other local workspaces that use the same VS Code profile.

## Marketplace Publish

The manifest is configured for the `62316e` publisher. If your Marketplace publisher ID is different, update `publisher` in [package.json](package.json) before publishing.

Package and publish with `vsce`:

```bash
npm install
npm run compile
npx @vscode/vsce package
npx @vscode/vsce login 62316e
npx @vscode/vsce publish
```

When `vsce login` asks for a token, paste your Visual Studio Marketplace personal access token directly into the terminal.

## Release Notes

### 0.0.3

- Added editor-only open todo counts after Markdown headings.
- Added `Insert/Update Todo Summary` for visible Markdown summary blocks.
- Todo Summary now refreshes automatically after toggling a todo with `Alt+D`.

### 0.0.2

- Renamed the extension to `mddo`.
- Added `mddo.decorationScope` to switch between marker-only and whole-line decorations.
- Added `mddo.colors.todo`, `mddo.colors.completed`, and `mddo.colors.rejected` settings.
- Added support for Markdown task-list markers like `- [ ]`, `- [+]`, and `- [-]`.
- Normalized todo marker font weight across all statuses.
- Added an MIT license.
- Added local VSIX package and install instructions.
- Added Marketplace metadata, icon packaging, and a focused `.vscodeignore`.

### 0.0.1

Initial basic implementation.

## License

MIT. See [LICENSE.md](LICENSE.md).

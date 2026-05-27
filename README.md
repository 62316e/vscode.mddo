# Markdown Todo Decorator

Decorates lightweight Markdown todo statuses and lets you cycle them from the keyboard.

## Features

- `[ ]` todo lines are gray.
- `[+]` completed lines are green.
- `[-]` rejected lines are orange.
- `Toggle Markdown Todo Status` cycles the current line through `[ ]`, `[+]`, and `[-]`.

## Usage

Open a Markdown file and write todo lines at the start of a line, optionally after indentation:

```markdown
[ ] this is a todo line
[+] this is completed
[-] this is rejected
```

Place the cursor on one of those lines and press `Alt+D`.

## Development

Run `npm run compile` to build the extension.

Press `F5` in VS Code to launch an Extension Development Host with the extension enabled.

## Release Notes

### 0.0.1

Initial basic implementation.

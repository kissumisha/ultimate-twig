# Ultimate Twig

A complete Twig 3.x formatter, syntax highlighter, and IntelliSense extension for Visual Studio Code.

## Description

Ultimate Twig provides comprehensive support for Twig templating in VS Code, featuring intelligent formatting, syntax highlighting that prioritizes Twig over HTML, and context-aware autocompletion for Twig, HTML, CSS, and JavaScript.

## Features

- **Full Twig 3.x Syntax Highlighting** - Complete support for all Twig tags, filters, functions, operators, and string interpolation with custom grammar that ensures Twig syntax takes precedence over HTML colors
- **Intelligent Code Formatting** - Unified formatter that handles Twig blocks, HTML structure, JavaScript in `<script>` tags, and CSS in `<style>` tags with proper nesting and indentation
- **IntelliSense & Autocompletion** - Context-aware suggestions for:
  - **Twig**: 15+ control structures, 50+ filters, functions, tests, operators, and constants
  - **HTML**: Common HTML5 tags with auto-closing and attributes
  - **CSS**: Properties in style attributes and tags
  - **JavaScript**: Keywords and methods in script tags
- **Auto-closing Pairs** - Automatic closing for `{%`, `{{`, and `{#` delimiters
- **Code Folding** - Fold Twig blocks for better code organization
- **Comment Toggling** - Quick block comment toggling with keyboard shortcuts

## How to Use

### Formatting

Format your Twig files with:
- **Format Document**: `Shift + Alt + F` (Windows/Linux) or `Shift + Option + F` (Mac)
- **Format on Save**: Enable in VSCode settings: `"editor.formatOnSave": true`

The formatter intelligently handles:
- Twig block indentation ({% block %}, {% if %}, {% for %}, etc.)
- HTML tag hierarchy with proper nesting
- JavaScript code inside `<script>` tags with brace-counting for callbacks
- CSS code inside `<style>` tags

### Autocompletion

Start typing and the extension will suggest:
- Twig tags when you type `{%`
- Twig variables when you type `{{`
- Filters after `|` in Twig expressions
- HTML tags and attributes outside Twig delimiters
- CSS properties in style attributes
- JavaScript keywords and methods in script tags

Completions can be toggled on/off individually in settings.

## Requirements

- Visual Studio Code 1.61 or higher

## Settings

Configure the extension through VSCode settings (Ctrl+, or Cmd+,) and search for "Ultimate Twig":

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ultimateTwig.twig.completion.enabled` | boolean | `true` | Enable/disable Twig completions |
| `ultimateTwig.html.completion.enabled` | boolean | `true` | Enable/disable HTML completions |
| `ultimateTwig.javascript.completion.enabled` | boolean | `true` | Enable/disable JavaScript completions |
| `ultimateTwig.css.completion.enabled` | boolean | `true` | Enable/disable CSS completions |

### Example Configuration

```json
{
  "ultimateTwig.twig.completion.enabled": true,
  "ultimateTwig.html.completion.enabled": true,
  "ultimateTwig.javascript.completion.enabled": true,
  "ultimateTwig.css.completion.enabled": true
}
```

## License

Copyright © 2025 Gary Aranda Dickens @ TGO Systems (Tuetego Ltd)

This project is MIT licensed

# Change Log


## [1.1.0] - 2026-03-30

### Added
- Support for custom HTML tags (web components) such as `<my-component>`, `<app-header>`, etc.
- Indentation settings spaces vs tabs [issue #5](https://github.com/kissumisha/ultimate-twig/issues/5)

### Fixes
- Fixed incorrect indentation when HTML tags appear on the same line as Twig comments (e.g. `</div>{# comment #}`)
- Fixed indentation and formatting issues for {% endblock %} and inline declarations [issue #3](https://github.com/kissumisha/ultimate-twig/issues/3)
- Fixed incorrect indentation of `{% endset %}` causing misaligned subsequent code [issue #4](https://github.com/kissumisha/ultimate-twig/issues/4)

### Thank you
- @SebNetbeans
- @EmadAlmahdi
- @felipep
- @jan-dh
- @AndCycle


## [1.0.1] - 2024-11-15

### Fixes
- Resolved an issue with incorrect indentation in nested Twig blocks
- Added tags `{%- {%~` 
- Fixed a bug causing IntelliSense to fail for certain Twig functions
- Fix issue where inlince tags set wring indentation
- Keep inlince Twig format inside tags and attritutes
- Fixed wrong attribution in Lincese


## [1.0.0] - 2024-11-08

- Initial published release

### Added
- Complete Twig 3.x syntax highlighting with priority over HTML colors
- Intelligent formatter for Twig, HTML, CSS, and JavaScript
- IntelliSense autocompletion for all languages (50+ Twig filters, tags, functions)
- Context-aware code suggestions
- Auto-closing pairs for Twig delimiters
- Code folding support for Twig blocks
- Block comment toggling

### Features
- Unified formatter handling all languages in Twig files
- Proper indentation for nested JavaScript callbacks
- Script/style tag content formatting with brace counting
- 4 simple settings for completion toggles per language

## [0.1.0] - Initial Release

- Basic extension structure
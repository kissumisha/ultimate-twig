const vscode = require('vscode');

/**
 * Twig Formatter
 * Formats Twig template files with configurable settings
 */
class TwigFormatter {
    constructor() {
        this.indentSize = 4;
        this.useTabs = false;
        this.preserveNewLines = true;
    }


    /**
 * Collapse Twig attribute (multiline or single line) into a single line
 * Adds a space before first twig block and after last twig block (if exists).
 */
    collapseTwigAttribute(attributeLines) {
        let collapsed = attributeLines.join(' ')
            .replace(/\s*\n\s*/g, ' ')    // Remove newlines
            .replace(/\s{2,}/g, ' ');     // Collapse multiple spaces

        // Does this class/style/... attribute contain Twig in the value?
        const twigBlockMatch = collapsed.match(/({%|{{)/);
        if (twigBlockMatch) {
            // Find where the quoted value starts and ends
            let m = collapsed.match(/=\s*([\'"])(.*)\1/);
            if (m) {
                let quote = m[1];
                let attrValue = m[2];
                // Ensure single space before first Twig block, and after last one

                // Before first Twig
                attrValue = attrValue.replace(/^([^\{\{%]+?)\s*({[{%])/, (full, before, twig) => {
                    return before.trim() + ' ' + twig;
                });
                // After last Twig
                attrValue = attrValue.replace(/(%}|}})\s*$/, (full, endTwig) => {
                    return endTwig + ' ';
                });

                // Remove extra spaces at end/start of value just in case
                attrValue = attrValue.replace(/\s{2,}/g, ' ').trim();

                // Rebuild attribute
                collapsed = collapsed.replace(/=\s*([\'"])(.*)\1/, `=${quote}${attrValue}${quote}`);
            } else {
                // Fallback: brute container, ensure any nearby Twig gets a space before/after
                collapsed = collapsed
                    .replace(/([^\{\{%]+?)\s*({[{%])/, (full, before, twig) => before.trim() + ' ' + twig)
                    .replace(/(%}|}})\s*([\'"])/g, '$1 $2')
                    .replace(/\s{2,}/g, ' ');
            }
        }

        return collapsed.trim();
    }


    /**
     * Split a line into Twig splitLines and other content
     */
    splitTwigLine(line) {
        // This splits a line into splitLines of '{% ... %}' or '{{ ... }}', leaving content as is
        const re = /(\{\%.*?\%\}|\{\{.*?\}\})/g;
        let result = [];
        let lastIndex = 0;
        let match;
        while ((match = re.exec(line)) !== null) {
            if (match.index > lastIndex) {
                result.push(line.slice(lastIndex, match.index));
            }
            result.push(match[0]);
            lastIndex = re.lastIndex;
        }
        if (lastIndex < line.length) {
            result.push(line.slice(lastIndex));
        }
        return result.filter(s => s.trim().length > 0);
    }

    /**
     * Format Twig document
     * @param {string} text - The text to format
     * @returns {string} - Formatted text
     */
    format(text) {
        const indentChar = this.useTabs ? '\t' : ' '.repeat(this.indentSize);

        let lines = text.split('\n');
        let formattedLines = [];
        let twigIndentLevel = 0;
        let htmlIndentLevel = 0;
        let inComment = false;
        let inVerbatim = false;
        let inScriptTag = false;
        let inStyleTag = false;
        let scriptTagBaseIndent = 0; // Store HTML indent level when entering script tag
        let styleTagBaseIndent = 0;  // Store HTML indent level when entering style tag

        let insideTwigAttribute = false;
        let attributeQuote = null;
        let attributeLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let trimmedLine = line.trim();

            ////////////////////////
            ////////////////////////

            // If already inside a multiline attribute value block
            if (insideTwigAttribute) {
                attributeLines.push(line);
                const quoteCount = attributeLines.join('\n').split(attributeQuote).length - 1;
                if (quoteCount % 2 === 0) {
                    // Attribute closed -- collapse into a single line with custom rules and indent correctly
                    let collapsed = this.collapseTwigAttribute(attributeLines);
                    let indent = indentChar.repeat(twigIndentLevel + htmlIndentLevel);
                    formattedLines.push(indent + collapsed);
                    insideTwigAttribute = false;
                    attributeLines = [];
                    attributeQuote = null;
                }
                continue;
            }

            // Detect attribute starting with an open quote and Twig
            const attrMatch = line.match(/<[\w\-]+[^>]*(class|style|[a-zA-Z\-]+)=([\'"])([^\'"]*({%|{{)[^\'"]*)$/);
            if (attrMatch) {
                insideTwigAttribute = true;
                attributeQuote = attrMatch[2];
                attributeLines = [line];
                continue;
            }

            // Detect single-line attribute with Twig and push directly (with indentation)
            if (line.match(/<[\w\-]+[^>]*=[\'"][^\'"]*({%|{{)[^\'"]*[\'"][^>]*>/)) {
                let collapsed = this.collapseTwigAttribute([line]);
                let indent = indentChar.repeat(twigIndentLevel + htmlIndentLevel);
                formattedLines.push(indent + collapsed);
                continue;
            }

            ////////////////////////
            ////////////////////////


            // Skip empty lines if preserveNewLines is true
            if (trimmedLine === '' && this.preserveNewLines) {
                formattedLines.push('');
                continue;
            }

            if (trimmedLine === '' && !this.preserveNewLines) {
                continue;
            }

            // Handle multi-line comments
            if (trimmedLine.includes('{#')) {
                inComment = true;
            }

            if (inComment) {
                formattedLines.push(indentChar.repeat(twigIndentLevel + htmlIndentLevel) + trimmedLine);
                if (trimmedLine.includes('#}')) {
                    inComment = false;
                }
                continue;
            }

            // Handle verbatim blocks (no formatting inside)
            if (trimmedLine.match(/\{%\s*verbatim\s*%\}/)) {
                inVerbatim = true;
            }

            if (inVerbatim) {
                formattedLines.push(indentChar.repeat(twigIndentLevel + htmlIndentLevel) + trimmedLine);
                if (trimmedLine.match(/\{%\s*endverbatim\s*%\}/)) {
                    inVerbatim = false;
                }
                continue;
            }

            // Track script and style tags and handle their opening/closing
            const isScriptOpening = trimmedLine.match(/<script[^>]*>/i) && !trimmedLine.match(/<\/script>/i);
            const isScriptClosing = trimmedLine.match(/<\/script>/i);
            const isStyleOpening = trimmedLine.match(/<style[^>]*>/i) && !trimmedLine.match(/<\/style>/i);
            const isStyleClosing = trimmedLine.match(/<\/style>/i);

            // Handle opening script/style tags
            if (isScriptOpening) {
                // Process the opening tag line first
                const totalIndent = twigIndentLevel + htmlIndentLevel;
                let formattedLine = indentChar.repeat(totalIndent) + trimmedLine;
                formattedLines.push(formattedLine);

                inScriptTag = true;
                scriptTagBaseIndent = htmlIndentLevel; // Store current HTML indent level
                htmlIndentLevel++; // Increase indent for content inside script tag
                continue;
            }

            if (isStyleOpening) {
                // Process the opening tag line first
                const totalIndent = twigIndentLevel + htmlIndentLevel;
                let formattedLine = indentChar.repeat(totalIndent) + trimmedLine;
                formattedLines.push(formattedLine);

                inStyleTag = true;
                styleTagBaseIndent = htmlIndentLevel; // Store current HTML indent level
                htmlIndentLevel++; // Increase indent for content inside style tag
                continue;
            }

            // Handle closing script/style tags
            if (isScriptClosing) {
                htmlIndentLevel = scriptTagBaseIndent; // Restore HTML indent level from before script tag
                inScriptTag = false;

                // Format the closing tag and skip normal HTML tag processing
                const totalIndent = twigIndentLevel + htmlIndentLevel;
                let formattedLine = indentChar.repeat(totalIndent) + trimmedLine;
                formattedLines.push(formattedLine);
                continue;
            }

            if (isStyleClosing) {
                htmlIndentLevel = styleTagBaseIndent; // Restore HTML indent level from before style tag
                inStyleTag = false;

                // Format the closing tag and skip normal HTML tag processing
                const totalIndent = twigIndentLevel + htmlIndentLevel;
                let formattedLine = indentChar.repeat(totalIndent) + trimmedLine;
                formattedLines.push(formattedLine);
                continue;
            }

            // Handle JavaScript/CSS indentation inside script/style tags
            if (inScriptTag || inStyleTag) {
                const trimmed = trimmedLine;

                // Count opening and closing braces/brackets on this line
                const openBraces = (trimmed.match(/\{/g) || []).length;
                const closeBraces = (trimmed.match(/\}/g) || []).length;
                const openBrackets = (trimmed.match(/\[/g) || []).length;
                const closeBrackets = (trimmed.match(/\]/g) || []).length;

                // Calculate net change
                const netChange = (openBraces + openBrackets) - (closeBraces + closeBrackets);

                // For lines with net decrease, decrease indent before rendering
                if (netChange < 0) {
                    htmlIndentLevel = Math.max(0, htmlIndentLevel + netChange);
                }

                const totalIndent = twigIndentLevel + htmlIndentLevel;
                let formattedLine = indentChar.repeat(totalIndent) + trimmedLine;
                formattedLines.push(formattedLine);

                // For lines with net increase, increase indent after rendering
                if (netChange > 0) {
                    htmlIndentLevel += netChange;
                }

                continue;
            }

            // Now split the line on Twig tags
            let splitLines = this.splitTwigLine(line);

            for (let t = 0; t < splitLines.length; t++) {
                let item = splitLines[t].trim();
                // HTML tag detection has to remain per-item
                const isCompleteTag = this.isHtmlOpeningTag(item) && this.isHtmlClosingTag(item);

                if (this.isTwigInsideAttribute(item)) {
                    formattedLines.push(indentChar.repeat(twigIndentLevel + htmlIndentLevel) + item);
                    continue;
                }


                if (this.shouldDecreaseHtmlIndent(item, isCompleteTag)) {
                    htmlIndentLevel = Math.max(0, htmlIndentLevel - 1);
                }

                // Detect Twig closing tags
                if (this.isClosingTag(item)) {
                    twigIndentLevel = Math.max(0, twigIndentLevel - 1);
                }

                // Output line at current indent
                formattedLines.push(indentChar.repeat(twigIndentLevel + htmlIndentLevel) + item);

                // Increase indent after opening Twig tags (but not for single-line sets or blocks)
                if (this.isOpeningTag(item) && !this.isSelfClosingTag(item) && !this.isSingleLineBlock(item)) {
                    twigIndentLevel++;
                }

                // Special handling for else/elseif - they decrease then increase indent
                if (this.isMidBlockTag(item)) {
                    // This is correct: decrease then increase for mid blocks
                    twigIndentLevel++;
                }


                // Check for opening HTML tags that should increase indent
                if (this.shouldIncreaseHtmlIndent(item, isCompleteTag)) {
                    htmlIndentLevel++;
                }
            }
        }

        return formattedLines.join('\n');
    }

    /**
     * Check if line contains an opening Twig tag
     */
    isOpeningTag(line) {
        const openingTags = [
            /\{%-?\s*block\s+/,
            /\{%-?\s*for\s+/,
            /\{%-?\s*if\s+/,
            /\{%-?\s*macro\s+/,
            /\{%-?\s*embed\s+/,
            /\{%-?\s*autoescape\s+/,
            /\{%-?\s*spaceless\s*%\}/,
            /\{%-?\s*trans\s*%\}/,
            /\{%-?\s*apply\s+/,
            /\{%-?\s*cache\s+/,
            /\{%-?\s*sandbox\s*%\}/,
            /\{%-?\s*with\s+/,
            /\{%-?\s*verbatim\s*%\}/
        ];
        // set should NOT indent unless multiline set (rare in Twig, but possible)
        const isSingleLineSet = /^\{%-?\s*set\s+.+%\}$/.test(line);
        if (isSingleLineSet) return false;
        return openingTags.some(pattern => pattern.test(line));
    }

    /**
     * Check if line contains a closing Twig tag
     */
    isClosingTag(line) {
        const closingTags = [
            /\{%-?\s*endblock\s*-?%\}/,
            /\{%-?\s*endfor\s*-?%\}/,
            /\{%-?\s*endif\s*-?%\}/,
            /\{%-?\s*endmacro\s*-?%\}/,
            /\{%-?\s*endset\s*-?%\}/,
            /\{%-?\s*endembed\s*-?%\}/,
            /\{%-?\s*endautoescape\s*-?%\}/,
            /\{%-?\s*endspaceless\s*-?%\}/,
            /\{%-?\s*endtrans\s*-?%\}/,
            /\{%-?\s*endapply\s*-?%\}/,
            /\{%-?\s*endcache\s*-?%\}/,
            /\{%-?\s*endsandbox\s*-?%\}/,
            /\{%-?\s*endwith\s*-?%\}/,
            /\{%-?\s*endverbatim\s*-?%\}/,
            /\{%-?\s*else\s*-?%\}/,
            /\{%-?\s*elseif\s+/
        ];
        return closingTags.some(pattern => pattern.test(line));
    }

    /**
     * Check if tag is self-closing
     */
    isSelfClosingTag(line) {
        const selfClosing = [
            /\{%-?\s*include\s+/,
            /\{%-?\s*import\s+/,
            /\{%-?\s*from\s+/,
            /\{%-?\s*use\s+/,
            /\{%-?\s*extends\s+/,
            /\{%-?\s*do\s+/,
            /\{%-?\s*flush\s*-?%\}/,
            /\{%-?\s*deprecated\s+/
        ];
        return selfClosing.some(pattern => pattern.test(line));
    }

    /**
     * Check if tag is a mid-block tag (else, elseif)
     * These tags close the previous block and open a new one
     */
    isMidBlockTag(line) {
        const midBlockTags = [
            /\{%-?\s*else\s*-?%\}/,
            /\{%-?\s*elseif\s+/
        ];
        return midBlockTags.some(pattern => pattern.test(line));
    }

    isSingleLineBlock(line) {
        // Match any "open" followed immediately by a "close"
        return /\{%-?\s*(if|for|block|macro|embed|autoescape|apply|cache|sandbox|with)\s+.*%\}\s*\{%-?\s*end\1\s*-?%\}/.test(line);
    }

    isTwigInsideAttribute(line) {
        // returns true if Twig appears inside attribute quotes (single or double)
        return /[a-zA-Z0-9-]+=(["']).*\{[{%].*\1/.test(line);
        // return /[a-zA-Z0-9-]+=(["'])[\s\S]*?(\{\{|\{%)[\s\S]*?\1/.test(line);

    }
    /**
     * Check if HTML indent should be decreased for this line
     */
    shouldDecreaseHtmlIndent(line, isCompleteTag) {
        return !isCompleteTag &&
            this.isHtmlClosingTag(line) &&
            !this.isHtmlSelfClosingTag(line);
    }

    /**
     * Check if HTML indent should be increased for this line
     */
    shouldIncreaseHtmlIndent(line, isCompleteTag) {
        return !isCompleteTag &&
            this.isHtmlOpeningTag(line) &&
            !this.isHtmlSelfClosingTag(line) &&
            !this.isHtmlClosingTag(line);
    }

    /**
     * Check if JavaScript/CSS line should decrease indent
     * Detects closing braces and similar constructs
     */
    isJsClosingLine(line) {
        const trimmed = line.trim();

        // Count opening and closing braces/brackets on this line
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        const openBrackets = (trimmed.match(/\[/g) || []).length;
        const closeBrackets = (trimmed.match(/\]/g) || []).length;

        // Net decrease: more closing than opening
        const netChange = (openBraces + openBrackets) - (closeBraces + closeBrackets);

        if (netChange < 0) {
            return true;
        }

        // Lines that start with closing brace (with possible trailing characters like );, ;, etc.)
        if (/^[}\]]/.test(trimmed)) {
            return true;
        }

        // Lines with } else or } else if
        if (/^\s*}\s*else/.test(line)) {
            return true;
        }

        return false;
    }

    /**
     * Check if JavaScript/CSS line should increase indent
     * Detects opening braces and similar constructs
     */
    isJsOpeningLine(line) {
        const trimmed = line.trim();

        // Count opening and closing braces/brackets on this line
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        const openBrackets = (trimmed.match(/\[/g) || []).length;
        const closeBrackets = (trimmed.match(/\]/g) || []).length;

        // Net increase: more opening than closing
        const netChange = (openBraces + openBrackets) - (closeBraces + closeBrackets);

        if (netChange > 0) {
            return true;
        }

        return false;
    }

    /**
     * Check if line contains an HTML opening tag
     */
    isHtmlOpeningTag(line) {
        // Match opening HTML tags (like <div>, <p>, etc.)
        // Use [^<>]* to avoid matching nested angle brackets
        return /<[a-zA-Z][a-zA-Z0-9]*(\s[^<>]*)?>/.test(line);
    }

    /**
     * Check if line contains an HTML closing tag
     */
    isHtmlClosingTag(line) {
        return /<\/[a-zA-Z][a-zA-Z0-9]*>/.test(line);
    }

    /**
     * Check if line is a self-closing HTML tag
     */
    isHtmlSelfClosingTag(line) {
        // Self-closing tags like <br/>, <img/>, <input/>, or tags that don't need closing
        const selfClosingTags = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)(\s[^>]*)?\/?>$/i;
        const trimmed = line.trim();
        return selfClosingTags.test(trimmed) || trimmed.endsWith('/>');
    }
}

/**
 * Activate the extension
 */
function activate(context) {
    console.log('Ultimate Twig extension is now active');

    // Register document formatter
    const formatter = vscode.languages.registerDocumentFormattingEditProvider('twig', {
        provideDocumentFormattingEdits(document) {
            const twigFormatter = new TwigFormatter();
            const text = document.getText();
            const formattedText = twigFormatter.format(text);

            // Create a text edit that replaces the entire document
            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new vscode.Range(firstLine.range.start, lastLine.range.end);

            return [vscode.TextEdit.replace(range, formattedText)];
        }
    });

    // Register range formatter
    const rangeFormatter = vscode.languages.registerDocumentRangeFormattingEditProvider('twig', {
        provideDocumentRangeFormattingEdits(document, range) {
            const twigFormatter = new TwigFormatter();
            const text = document.getText(range);
            const formattedText = twigFormatter.format(text);

            return [vscode.TextEdit.replace(range, formattedText)];
        }
    });

    // Register Twig completion provider
    const twigCompletionProvider = vscode.languages.registerCompletionItemProvider('twig', {
        provideCompletionItems(document, position) {
            const twigConfig = vscode.workspace.getConfiguration('ultimateTwig.twig.completion');
            const twigEnabled = twigConfig.get('enabled', true);

            if (!twigEnabled) {
                return [];
            }

            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            const completions = [];

            // Check if we're in a Twig context
            if (linePrefix.includes('{{') || linePrefix.includes('{%')) {
                // Add Twig tag completions
                const tags = ['if', 'else', 'elseif', 'endif', 'for', 'endfor', 'block', 'endblock',
                    'extends', 'include', 'import', 'from', 'macro', 'endmacro', 'set', 'endset',
                    'embed', 'endembed', 'apply', 'endapply', 'cache', 'endcache', 'with', 'endwith',
                    'autoescape', 'endautoescape', 'spaceless', 'endspaceless', 'trans', 'endtrans',
                    'verbatim', 'endverbatim', 'sandbox', 'endsandbox', 'do', 'flush', 'deprecated'];

                tags.forEach(tag => {
                    const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Keyword);
                    item.detail = 'Twig tag';
                    completions.push(item);
                });

                // Add Twig filter completions
                const filters = ['abs', 'batch', 'capitalize', 'column', 'convert_encoding', 'country_name',
                    'currency_name', 'currency_symbol', 'data_uri', 'date', 'date_modify', 'default',
                    'escape', 'e', 'filter', 'first', 'format', 'format_currency', 'format_date',
                    'format_datetime', 'format_number', 'format_time', 'inky_to_html', 'inline_css',
                    'join', 'json_encode', 'keys', 'language_name', 'last', 'length', 'locale_name',
                    'lower', 'map', 'markdown_to_html', 'merge', 'nl2br', 'number_format', 'raw',
                    'reduce', 'replace', 'reverse', 'round', 'slice', 'sort', 'spaceless', 'split',
                    'striptags', 'title', 'timezone_name', 'trim', 'u', 'upper', 'url_encode', 'slug'];

                filters.forEach(filter => {
                    const item = new vscode.CompletionItem(filter, vscode.CompletionItemKind.Function);
                    item.detail = 'Twig filter';
                    item.insertText = filter;
                    completions.push(item);
                });

                // Add Twig function completions
                const functions = ['attribute', 'block', 'constant', 'country_timezones', 'cycle', 'date',
                    'dump', 'html_classes', 'include', 'max', 'min', 'parent', 'random',
                    'range', 'source', 'template_from_string'];

                functions.forEach(func => {
                    const item = new vscode.CompletionItem(func, vscode.CompletionItemKind.Function);
                    item.detail = 'Twig function';
                    item.insertText = new vscode.SnippetString(`${func}($1)$0`);
                    completions.push(item);
                });

                // Add Twig test completions
                const tests = ['defined', 'null', 'empty', 'even', 'odd', 'iterable', 'same as', 'divisible by'];
                tests.forEach(test => {
                    const item = new vscode.CompletionItem(test, vscode.CompletionItemKind.Operator);
                    item.detail = 'Twig test';
                    completions.push(item);
                });

                // Add operators and keywords
                const operators = ['not', 'and', 'or', 'in', 'is', 'as', 'matches', 'starts with', 'ends with'];
                operators.forEach(op => {
                    const item = new vscode.CompletionItem(op, vscode.CompletionItemKind.Operator);
                    item.detail = 'Twig operator';
                    completions.push(item);
                });

                // Add constants
                const constants = ['true', 'false', 'null', 'none'];
                constants.forEach(constant => {
                    const item = new vscode.CompletionItem(constant, vscode.CompletionItemKind.Constant);
                    item.detail = 'Twig constant';
                    completions.push(item);
                });
            }

            return completions;
        }
    }, '{', '%', '|', ' '); // Trigger characters

    // Register HTML completion provider for Twig files
    const htmlCompletionProvider = vscode.languages.registerCompletionItemProvider('twig', {
        provideCompletionItems(document, position) {
            const htmlConfig = vscode.workspace.getConfiguration('ultimateTwig.html.completion');
            const htmlEnabled = htmlConfig.get('enabled', true);

            if (!htmlEnabled) {
                return [];
            }

            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            const completions = [];

            // Check if we're in an HTML context (not inside Twig delimiters)
            const beforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            const twigDelimiters = (beforeCursor.match(/\{\{|\{%|\{#/g) || []).length;
            const twigClosers = (beforeCursor.match(/\}\}|%\}|#\}/g) || []).length;

            // Only provide HTML completions if we're not inside Twig tags
            if (twigDelimiters === twigClosers) {
                // Common HTML tags
                const htmlTags = ['div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
                    'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'nav', 'main',
                    'section', 'article', 'aside', 'strong', 'em', 'code', 'pre'];

                htmlTags.forEach(tag => {
                    const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Property);
                    item.detail = 'HTML tag';
                    item.insertText = new vscode.SnippetString(`<${tag}>$1</${tag}>$0`);
                    completions.push(item);
                });

                // Common HTML attributes
                if (linePrefix.match(/<[a-zA-Z0-9-]+\s+[^>]*$/)) {
                    const attributes = ['class', 'id', 'style', 'src', 'href', 'alt', 'title', 'type', 'name',
                        'value', 'placeholder', 'data-', 'aria-', 'role', 'tabindex'];

                    attributes.forEach(attr => {
                        const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
                        item.detail = 'HTML attribute';
                        item.insertText = new vscode.SnippetString(`${attr}="$1"$0`);
                        completions.push(item);
                    });
                }
            }

            return completions;
        }
    }, '<', ' ');

    // Register CSS completion provider for style attributes and style tags
    const cssCompletionProvider = vscode.languages.registerCompletionItemProvider('twig', {
        provideCompletionItems(document, position) {
            const cssConfig = vscode.workspace.getConfiguration('ultimateTwig.css.completion');
            const cssEnabled = cssConfig.get('enabled', true);

            if (!cssEnabled) {
                return [];
            }

            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            const completions = [];

            // Check if we're in a style attribute or style tag
            if (linePrefix.includes('style="') || linePrefix.includes('style=\'')) {
                const cssProperties = ['color', 'background', 'background-color', 'border', 'border-radius',
                    'padding', 'margin', 'width', 'height', 'display', 'position', 'top',
                    'left', 'right', 'bottom', 'font-size', 'font-family', 'font-weight',
                    'text-align', 'text-decoration', 'flex', 'grid', 'opacity', 'z-index'];

                cssProperties.forEach(prop => {
                    const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                    item.detail = 'CSS property';
                    item.insertText = new vscode.SnippetString(`${prop}: $1;$0`);
                    completions.push(item);
                });
            }

            return completions;
        }
    }, ':', ' ');

    // Register JavaScript completion provider for script tags
    const jsCompletionProvider = vscode.languages.registerCompletionItemProvider('twig', {
        provideCompletionItems(document, position) {
            const jsConfig = vscode.workspace.getConfiguration('ultimateTwig.javascript.completion');
            const jsEnabled = jsConfig.get('enabled', true);

            if (!jsEnabled) {
                return [];
            }

            const completions = [];

            // Check if we're in a script tag context
            const beforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            const inScript = beforeCursor.lastIndexOf('<script') > beforeCursor.lastIndexOf('</script>');

            if (inScript) {
                // Common JavaScript keywords and functions
                const jsKeywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
                    'class', 'new', 'this', 'typeof', 'async', 'await', 'try', 'catch'];

                jsKeywords.forEach(keyword => {
                    const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                    item.detail = 'JavaScript keyword';
                    completions.push(item);
                });

                // Common JavaScript objects and methods
                const jsMethods = ['console.log', 'document.querySelector', 'document.getElementById',
                    'addEventListener', 'fetch', 'Promise', 'Array', 'Object', 'JSON.parse',
                    'JSON.stringify', 'setTimeout', 'setInterval'];

                jsMethods.forEach(method => {
                    const item = new vscode.CompletionItem(method, vscode.CompletionItemKind.Method);
                    item.detail = 'JavaScript method';
                    if (method.includes('.')) {
                        item.insertText = new vscode.SnippetString(`${method}($1)$0`);
                    }
                    completions.push(item);
                });
            }

            return completions;
        }
    }, '.', ' ');

    context.subscriptions.push(formatter);
    context.subscriptions.push(rangeFormatter);
    context.subscriptions.push(twigCompletionProvider);
    context.subscriptions.push(htmlCompletionProvider);
    context.subscriptions.push(cssCompletionProvider);
    context.subscriptions.push(jsCompletionProvider);
}

/**
 * Deactivate the extension
 */
function deactivate() { }

module.exports = {
    activate,
    deactivate
};

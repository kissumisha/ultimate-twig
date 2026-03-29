'use strict';

/**
 * Comprehensive test suite for TwigFormatter
 * Tests all three bugs from issue #3 plus edge cases and JS safety
 */

// ─── Test runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, input, expected) {
    const formatter = new TwigFormatter();
    const result = formatter.format(input.trim());
    const exp = expected.trim();
    if (result === exp) {
        console.log(`  ✓  ${name}`);
        passed++;
    } else {
        console.log(`  ✗  ${name}`);
        console.log('     INPUT:');
        input.trim().split('\n').forEach(l => console.log(`       | ${l}`));
        console.log('     EXPECTED:');
        exp.split('\n').forEach(l => console.log(`       | ${l}`));
        console.log('     GOT:');
        result.split('\n').forEach(l => console.log(`       | ${l}`));
        failed++;
    }
}

// ─── Extract TwigFormatter ───────────────────────────────────────────────────
// Since the class is not exported we grab it via eval into global scope.
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../extension.js'), 'utf8');

// Extract only the class body (everything from `class TwigFormatter` to the closing `}` before `function activate`)
const classMatch = src.match(/(class TwigFormatter \{[\s\S]*?\n\})\s*\n\/\*\*/);
if (!classMatch) {
    console.error('Could not extract TwigFormatter class from extension.js');
    process.exit(1);
}
// Assign to global so it's accessible everywhere in this file
global.TwigFormatter = eval('(' + classMatch[1] + ')'); // eslint-disable-line no-eval

// ─── Test cases ─────────────────────────────────────────────────────────────

console.log('\n=== Issue #3 Bug Fixes ===\n');

// ── Bug 1: endblock with labels ──────────────────────────────────────────────
console.log('-- Bug 1: endblock with labels --');

test(
    'endblock with simple label stays at block level',
    `
{% block form_label %}
    ...
{% endblock form_label %}
`,
    `
{% block form_label %}
    ...
{% endblock form_label %}
`
);

test(
    'nested blocks with labels - correct indentation',
    `
{% block sidebar %}
    {% block inner_sidebar %}
        ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}
`,
    `
{% block sidebar %}
    {% block inner_sidebar %}
        ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}
`
);

test(
    'multiple adjacent blocks with labels - no drift',
    `
{% block form_label %}
    ...
{% endblock form_label %}

{% block sidebar %}
    {% block inner_sidebar %}
        ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}
`,
    `
{% block form_label %}
    ...
{% endblock form_label %}

{% block sidebar %}
    {% block inner_sidebar %}
        ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}
`
);

test(
    'endblock without label still works',
    `
{% block content %}
    <p>Hello</p>
{% endblock %}
`,
    `
{% block content %}
    <p>Hello</p>
{% endblock %}
`
);

test(
    'endblock with dash whitespace control and label',
    `
{% block foo %}
    text
{%- endblock foo %}
`,
    `
{% block foo %}
    text
{%- endblock foo %}
`
);

// ── Bug 2: inline block shortcut ─────────────────────────────────────────────
console.log('\n-- Bug 2: inline block shortcut --');

test(
    'inline block shortcut does not indent following block',
    `
{% block title page_title|title %}

{% block form_label %}
{% endblock %}
`,
    `
{% block title page_title|title %}

{% block form_label %}
{% endblock %}
`
);

test(
    'inline block shortcut with variable expression',
    `
{% block title page_title %}
{% block body %}
    content
{% endblock %}
`,
    `
{% block title page_title %}
{% block body %}
    content
{% endblock %}
`
);

test(
    'inline block shortcut with filter chain',
    `
{% block title page_title|title|upper %}
{% block subtitle sub_title|lower %}
{% block content %}
    <p>Hello</p>
{% endblock %}
`,
    `
{% block title page_title|title|upper %}
{% block subtitle sub_title|lower %}
{% block content %}
    <p>Hello</p>
{% endblock %}
`
);

test(
    'inline block shortcut with function call',
    `
{% block count items|length %}
{% block body %}
    text
{% endblock %}
`,
    `
{% block count items|length %}
{% block body %}
    text
{% endblock %}
`
);

test(
    'regular block (no value) still opens indent',
    `
{% block content %}
    <p>Hello</p>
{% endblock %}
`,
    `
{% block content %}
    <p>Hello</p>
{% endblock %}
`
);

// ── Bug 3: inline text/expression without HTML element ───────────────────────
console.log('\n-- Bug 3: inline text with expressions --');

test(
    'inline expression with surrounding text stays on one line',
    `
{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`,
    `
{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`
);

test(
    'multiple expressions on one line stay together',
    `
{% block greeting %}
    Hello {{ first_name }} {{ last_name }}!
{% endblock %}
`,
    `
{% block greeting %}
    Hello {{ first_name }} {{ last_name }}!
{% endblock %}
`
);

test(
    'expression-only line stays on one line',
    `
{% block value %}
    {{ some_variable }}
{% endblock %}
`,
    `
{% block value %}
    {{ some_variable }}
{% endblock %}
`
);

test(
    'inline text with expression, then HTML block — both correct',
    `
{% block title %}
    <p>Profil de {{ profil | lower }}.</p>
{% endblock %}

{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`,
    `
{% block title %}
    <p>Profil de {{ profil | lower }}.</p>
{% endblock %}

{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`
);

test(
    'expression with arithmetic stays on one line',
    `
{% block total %}
    Total: {{ price * quantity }} EUR
{% endblock %}
`,
    `
{% block total %}
    Total: {{ price * quantity }} EUR
{% endblock %}
`
);

// ── Combined scenario from issue ─────────────────────────────────────────────
console.log('\n-- Combined scenario from issue #3 --');

test(
    'full issue #3 scenario - all three bugs together',
    `
{% block form_label %}
    ...
{% endblock form_label %}

{% block sidebar %}
    {% block inner_sidebar %}
            ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}

{% block title page_title|title %}

{% block form_label %}
{% endblock %}

{% block title %}
    <p>Profil de {{ profil | lower }}.</p>
{% endblock %}

{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`,
    `
{% block form_label %}
    ...
{% endblock form_label %}

{% block sidebar %}
    {% block inner_sidebar %}
        ...
    {% endblock inner_sidebar %}
{% endblock sidebar %}

{% block title page_title|title %}

{% block form_label %}
{% endblock %}

{% block title %}
    <p>Profil de {{ profil | lower }}.</p>
{% endblock %}

{% block title %}
    Profil de {{ profil | lower }}.
{% endblock %}
`
);

// ── JavaScript safety ────────────────────────────────────────────────────────
console.log('\n=== JavaScript Safety ===\n');

test(
    'script block content is preserved with correct indentation',
    `
<script>
function hello() {
    console.log('world');
}
</script>
`,
    `
<script>
    function hello() {
        console.log('world');
    }
</script>
`
);

test(
    'twig block wrapping script tag preserved',
    `
{% block scripts %}
<script>
function init() {
    var x = 1;
}
</script>
{% endblock %}
`,
    `
{% block scripts %}
    <script>
        function init() {
            var x = 1;
        }
    </script>
{% endblock %}
`
);

test(
    'JS with object literal braces not confused with Twig',
    `
<script>
var config = {
    name: 'test',
    value: 42
};
</script>
`,
    `
<script>
    var config = {
        name: 'test',
        value: 42
    };
</script>
`
);

test(
    'JS with nested function blocks',
    `
<script>
function outer() {
    function inner() {
        return true;
    }
    return inner();
}
</script>
`,
    `
<script>
    function outer() {
        function inner() {
            return true;
        }
        return inner();
    }
</script>
`
);

test(
    'JS closing brace on same line as content',
    `
<script>
var obj = { key: 'value' };
</script>
`,
    `
<script>
    var obj = { key: 'value' };
</script>
`
);

test(
    'Twig variables inside script tag are not processed as Twig blocks',
    `
<script>
var url = '{{ path("route_name") }}';
var name = '{{ user.name }}';
</script>
`,
    `
<script>
    var url = '{{ path("route_name") }}';
    var name = '{{ user.name }}';
</script>
`
);

// ── General Twig indentation ─────────────────────────────────────────────────
console.log('\n=== General Twig Indentation ===\n');

test(
    'if / elseif / else / endif',
    `
{% if x > 0 %}
    positive
{% elseif x < 0 %}
    negative
{% else %}
    zero
{% endif %}
`,
    `
{% if x > 0 %}
    positive
{% elseif x < 0 %}
    negative
{% else %}
    zero
{% endif %}
`
);

test(
    'for loop',
    `
{% for item in items %}
    {{ item }}
{% endfor %}
`,
    `
{% for item in items %}
    {{ item }}
{% endfor %}
`
);

test(
    'nested if inside for',
    `
{% for item in items %}
    {% if item.active %}
        {{ item.name }}
    {% endif %}
{% endfor %}
`,
    `
{% for item in items %}
    {% if item.active %}
        {{ item.name }}
    {% endif %}
{% endfor %}
`
);

test(
    'self-closing tags (include, extends) do not affect indent',
    `
{% extends "base.html.twig" %}
{% block content %}
    {% include "partial.html.twig" %}
    <p>Hello</p>
{% endblock %}
`,
    `
{% extends "base.html.twig" %}
{% block content %}
    {% include "partial.html.twig" %}
    <p>Hello</p>
{% endblock %}
`
);

test(
    'macro definition and call',
    `
{% macro input(name, value) %}
    <input name="{{ name }}" value="{{ value }}">
{% endmacro %}
`,
    `
{% macro input(name, value) %}
    <input name="{{ name }}" value="{{ value }}">
{% endmacro %}
`
);

test(
    'set variable (single line) does not affect indent',
    `
{% set foo = "bar" %}
{% block content %}
    {{ foo }}
{% endblock %}
`,
    `
{% set foo = "bar" %}
{% block content %}
    {{ foo }}
{% endblock %}
`
);

test(
    'dash whitespace control on all sides',
    `
{%- block content -%}
    <p>text</p>
{%- endblock -%}
`,
    `
{%- block content -%}
    <p>text</p>
{%- endblock -%}
`
);

test(
    'apply filter block',
    `
{% apply upper %}
    hello world
{% endapply %}
`,
    `
{% apply upper %}
    hello world
{% endapply %}
`
);

test(
    'verbatim block passes through unchanged',
    `
{% verbatim %}
    {{ not.processed }}
    {% not processed %}
{% endverbatim %}
`,
    `
{% verbatim %}
    {{ not.processed }}
    {% not processed %}
{% endverbatim %}
`
);

test(
    'comment block passes through',
    `
{# This is a comment #}
{% block content %}
    text
{% endblock %}
`,
    `
{# This is a comment #}
{% block content %}
    text
{% endblock %}
`
);

test(
    'HTML with Twig attribute - no splitting',
    `
{% block content %}
    <div class="{{ active_class }}">
        <p>Hello</p>
    </div>
{% endblock %}
`,
    `
{% block content %}
    <div class="{{ active_class }}">
        <p>Hello</p>
    </div>
{% endblock %}
`
);

test(
    'deeply nested blocks with labels',
    `
{% block page %}
    {% block header %}
        {% block title %}
            My Title
        {% endblock title %}
    {% endblock header %}
    {% block body %}
        content
    {% endblock body %}
{% endblock page %}
`,
    `
{% block page %}
    {% block header %}
        {% block title %}
            My Title
        {% endblock title %}
    {% endblock header %}
    {% block body %}
        content
    {% endblock body %}
{% endblock page %}
`
);

test(
    'with block',
    `
{% with { foo: 42 } %}
    {{ foo }}
{% endwith %}
`,
    `
{% with { foo: 42 } %}
    {{ foo }}
{% endwith %}
`
);

test(
    'mixed inline shortcut and regular block',
    `
{% block page_title "My App" %}
{% block content %}
    <p>Welcome</p>
{% endblock content %}
`,
    `
{% block page_title "My App" %}
{% block content %}
    <p>Welcome</p>
{% endblock content %}
`
);

// ── CSS safety ───────────────────────────────────────────────────────────────
console.log('\n=== CSS Safety ===\n');

test(
    'style block with CSS rules',
    `
<style>
body {
    color: red;
}
</style>
`,
    `
<style>
    body {
        color: red;
    }
</style>
`
);

// ── Script/style tag indentation bug (single-line tags inside nesting) ───────
console.log('\n=== Script/Style Tag Indentation Bug ===\n');

test(
    'single-line script tag inside HTML nesting does not reset indent',
    `
<div>
    <script src="/js/app.js"></script>
    <p>Hello</p>
</div>
`,
    `
<div>
    <script src="/js/app.js"></script>
    <p>Hello</p>
</div>
`
);

test(
    'single-line script tag inside Twig block does not reset indent',
    `
{% block head %}
    <script src="/js/app.js"></script>
    <p>Hello</p>
{% endblock %}
`,
    `
{% block head %}
    <script src="/js/app.js"></script>
    <p>Hello</p>
{% endblock %}
`
);

test(
    'single-line script tag deep in HTML nesting does not collapse indent',
    `
<div class="wrapper">
    <header>
        <script src="/js/app.js"></script>
        <h1>Title</h1>
    </header>
</div>
`,
    `
<div class="wrapper">
    <header>
        <script src="/js/app.js"></script>
        <h1>Title</h1>
    </header>
</div>
`
);

test(
    'single-line style tag inside HTML nesting does not reset indent',
    `
<div>
    <style type="text/css"></style>
    <p>Hello</p>
</div>
`,
    `
<div>
    <style type="text/css"></style>
    <p>Hello</p>
</div>
`
);

test(
    'single-line script with Twig src attribute inside Twig block',
    `
{% block head %}
    <script src="/js/app.js?v={{ cache_v }}"></script>
    <p>Hello</p>
{% endblock %}
`,
    `
{% block head %}
    <script src="/js/app.js?v={{ cache_v }}"></script>
    <p>Hello</p>
{% endblock %}
`
);

test(
    'multi-line script inside Twig block still indents correctly',
    `
{% block scripts %}
<script>
var x = 1;
</script>
{% endblock %}
`,
    `
{% block scripts %}
    <script>
        var x = 1;
    </script>
{% endblock %}
`
);

test(
    'multiple single-line script tags inside nesting - no indent drift',
    `
<div>
    <script src="/js/a.js"></script>
    <script src="/js/b.js"></script>
    <p>After scripts</p>
</div>
`,
    `
<div>
    <script src="/js/a.js"></script>
    <script src="/js/b.js"></script>
    <p>After scripts</p>
</div>
`
);

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('All tests passed!');
}

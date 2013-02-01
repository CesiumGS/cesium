<?php

require_once('Parser.php');
require_once('JavaScriptSymbol.php');

class JavaScriptParser extends Parser {
  protected $symbol_class = JavaScriptSymbol;

  protected function build() {
    $this->symbol(';');
    $this->symbol("\n");
    $this->symbol(',');
    $this->symbol(')');
    $this->symbol(']');
    $this->symbol('}');
    $this->symbol('else');
    $this->symbol('case');
    $this->symbol('default');
    $this->symbol('catch');
    $this->symbol('finally');

    $symbol = $this->symbol(':');
    $symbol->lbp = 'lbp_colon';
    $symbol->led = 'led_colon';

    $this->symbol('(end)');
    $this->symbol('(name)');

    $this->assignment('=')->led = 'led_equals';
    $this->assignment('+=');
    $this->assignment('-=');
    $this->assignment('*=');
    $this->assignment('/=');
    $this->assignment('%=');
    $this->assignment('<<=');
    $this->assignment('>>=');
    $this->assignment('>>>=');
    $this->assignment('&=');
    $this->assignment('^=');
    $this->assignment('|=');

    $this->infix('?:', 20);
    $this->infixr('||', 21);
    $this->infixr('&&', 22);
    $this->infix('|', 23);
    $this->infix('^', 24);
    $this->infix('&', 25);

    $this->infix('==', 30);
    $this->infix('!=', 30);
    $this->infix('===', 30);
    $this->infix('!==', 30);

    $this->infix('<', 40);
    $this->infix('<=', 40);
    $this->infix('>', 40);
    $this->infix('>=', 40);
    $this->infix('in', 40);
    $this->infix('instanceof', 40);

    $this->infix('<<', 45);
    $this->infix('>>', 45);
    $this->infix('>>>', 45);

    $this->infix('+', 50);
    $this->infix('-', 50);

    $this->infix('*', 60);
    $this->infix('/', 60);
    $this->infix('%', 60);

    // prefix is 70
    $this->prefix('!');
    $this->prefix('~');
    $this->prefix('+');
    $this->prefix('-');
    $this->prefix('typeof');
    $this->prefix('void');
    $this->prefix('delete');
    $this->prefix('throw');

    // crement is 75
    $symbol = $this->symbol('++');
    $symbol->lbp = 'lbp_crement';
    $symbol->led = 'led_crement';
    $symbol->nud = 'nud_crement';
    $symbol = $this->symbol('--');
    $symbol->lbp = 'lbp_crement';
    $symbol->led = 'led_crement';
    $symbol->nud = 'nud_crement';

    $this->infix('(', 80, 'led_parenthesis')->nud = 'nud_parenthesis';

    $this->infix('.', 85, 'led_period');
    $this->infix('[', 85, 'led_bracket');
    $this->prefix('new')->lbp = 85;

    // Non-defined stuff:

    $this->infix('?', 20, 'led_questionmark');

    $this->constant('true', TRUE);
    $this->constant('false', FALSE);
    $this->constant('null', 'null');
    $this->constant('undefined', NULL);
    $this->constant('arguments', 'arguments');

    $this->symbol('(literal)')->nud = 'nud_itself';

    $this->stmt('{', 'std_curly');
    $this->stmt('var', 'std_var');
    $this->stmt('do', 'std_do');
    $this->stmt('while', 'std_while');
    $this->stmt('for', 'std_for');
    $this->stmt('if', 'std_if');
    $this->stmt('switch', 'std_switch');
    $this->stmt('try', 'std_try');
    $this->stmt('break', 'std_break');
    $this->stmt('return', 'std_return');
    $this->stmt('function', 'nud_function');
    $this->prefix('function', 'nud_function');

    $symbol = $this->symbol('this');
    $symbol->nud = 'nud_this';

    $this->prefix('[', 'nud_bracket');
    $this->prefix('{', 'nud_curly');
  }
}
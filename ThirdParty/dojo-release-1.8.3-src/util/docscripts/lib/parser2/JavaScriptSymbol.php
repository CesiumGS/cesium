<?php

require_once('Symbol.php');

require_once('JavaScriptFunctionCall.php');
require_once('JavaScriptLiteral.php');
require_once('JavaScriptString.php');
require_once('JavaScriptNumber.php');
require_once('JavaScriptRegExp.php');
require_once('JavaScriptFunction.php');
require_once('JavaScriptTernary.php');
require_once('JavaScriptObject.php');
require_once('JavaScriptArray.php');
require_once('JavaScriptVariable.php');
require_once('JavaScriptAssignment.php');
require_once('JavaScriptOr.php');

class JavaScriptSymbol extends Symbol {
  /**
   * Guesses the type of the current symbol
   */
  public function type() {
    switch($this->id){
    case '{':
      return 'Object';
    case '[':
      return 'Array';
    case 'function':
      return 'Function';
    }
  }

  public function convert($recursing = FALSE) {
    if ($this->arity == 'literal') {
      switch($this->type){
      case 'string':
        return new JavaScriptString($this->value);
      case 'number':
        return new JavaScriptNumber($this->value);
      case 'regex':
        return new JavaScriptRegExp($this->value);
      default:
        return new JavaScriptLiteral($this->value);
      }
    }
    else {
      switch($this->id){
      case '?':
        return new JavaScriptTernary($this->first, $this->second, $this->third);
      case '(':
        return new JavaScriptFunctionCall($this->first, $this->second);
      case 'function':
        return new JavaScriptFunction($this);
      case '{':
        return new JavaScriptObject($this);
      case '[':
      case '.':
        if ($this->arity == 'unary') {
          return new JavaScriptArray($this->first);
        }else{
          return new JavaScriptVariable($this);
        }
      case '=':
        return new JavaScriptAssignment($this->first, $this->second);
      case '||':
        $output = array();

        $first = $this->first;
        if (is_array($first) && count($first == 1)) {
          $first = $first[0];
        }
        $first = $first->convert(TRUE);

        if (is_array($first)) {
          $output = array_merge($output, $first);
        }
        else {
          $output[] = $first;
        }

        $seconds = $this->second;
        if (!is_array($seconds)) {
          $seconds = array($seconds);
        }
        foreach ($seconds as $second) {
          $second = $second->convert(TRUE);
          if (is_array($second)) {
            $output = array_merge($output, $second);
          }
          else {
            $output[] = $second;
          }
        }

        return $recursing ? $output : new JavaScriptOr($output);
      }

      switch ($this->arity) {
      case 'name':
        if ($this->value == 'new') {
          // TODO: Make new matter
          if ($this->first->id == 'function') {
            return new JavaScriptFunction($this->first, true);
          }
          elseif ($this->first->id == '(') {
            return new JavaScriptFunctionCall($this->first, $this->second, true);
          }
          elseif ($this->first->id == '.' || $this->first->id == '[') {
            return new JavaScriptVariable($this->first, true);
          }
          else {
            throw new Exception("Line {$this->first->line_number}, char {$this->first->char_pos}: New statement preceeds unknown");
          }
        }
        return new JavaScriptVariable($this);
      case 'literal':
      case 'operator':
      case 'this':
      case 'unary':
        return new JavaScriptLiteral($this);
      }
    }
    throw new Exception("No class for {$this->id}:{$this->arity}");
  }

  // led/nud/lbp functions

  public function led_bracket($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression();
    $this->arity = 'binary';
    $parser->advance(']');
    return $this;
  }

  public function nud_bracket($parser) {
    $items = array();
    if (!$parser->peek(']')) {
      while (1) {
        $items[] = $parser->expression();
        if (!$parser->peek(',')) {
          break;
        }
        $parser->advance(',');
        if ($parser->peek(']')) {
          // Be lenient about trailing commas
          break;
        }
      }
    }
    $parser->advance(']');
    $this->first = $items;
    $this->arity = 'unary';
    return $this;
  }

  public function std_break($parser) {
    $parser->skip_terminators();
    $this->arity = 'statement';
    return $this;
  }

  public function lbp_colon($parser, $left) {
    if ($left->arity == 'name' && $parser->peek2(array('for', 'while', 'do'))) {
      return 100;
    }
    return 0;
  }

  public function led_colon($parser, $left) {
    $this->first = $left;
    if ($parser->token->arity != 'name') {
      throw new Exception("Line {$left->line_number}, char {$left->char_pos}: Expected a property name");
    }
    $parser->token->arity = 'literal';
    $this->second = $parser->expression();
    $this->arity = 'binary';
    $parser->skip_terminators();
    return $this;
  }

  public function lbp_crement($parser, $left) {
    if ($left->id == '.' || $left->id == '[' || $left->arity == 'name') {
      return 100;
    }
    return 0;
  }

  public function led_crement($parser, $left) {
    // Show that the in/decrementer is on the right
    $this->first = $left;
    $this->arity = 'unary';
    return $this;
  }

  public function nud_crement($parser) {
    // Show that the in/decrement is before the expression
    $this->first = NULL;
    $this->second = $parser->expression(75);
    return $this;
  }

  public function nud_curly($parser) {
    $values = array();

    $this->comments = array();
    if (!$parser->peek('}')) {
      while (1) {
        $token = $parser->token;
        if ($token->arity != 'name' && $token->arity != 'literal') {
          throw new Exception("Line {$token->line_number}, char {$token->char_pos}: Bad key: {$token->id}");
        }
        $comments = $parser->comments_before($token);
        if (!empty($comments)) {
          if (!empty($this->comments)) {
            $this->comments[] = "\n";
          }
          $this->comments = array_merge($this->comments, $comments);
        }
        $parser->advance();
        $parser->advance(':');
        $expression = $parser->expression();
        if (is_array($expression)) {
          $expression = $expression[0];
        }
        $expression->key = $token->value;
        $values[] = $expression;
        if (!$parser->peek(',')) {
          break;
        }
        $token = $parser->token;
        $parser->advance(',');
        if ($parser->peek('}')) {
          // Be lenient about trailing commas
          break;
        }
      }
    }

    if ($parser->peek('}')) {
      $this->comments = array_merge($this->comments, $parser->comments_before($parser->token));
    }
    $parser->advance('}');
    $this->first = $values;
    $this->arity = 'unary';
    return $this;
  }

  public function std_curly($parser) {
    $statements = $parser->statements(array('}'));
    $parser->advance('}');
    return $statements;
  }

  public function std_do($parser) {
    if ($parser->peek('{')) {
      $this->first = $this->block($parser);
    }
    else {
      $this->first = $parser->expression($parser);
      $parser->skip_terminators();
    }
    $parser->advance('while');
    $parser->advance('(');
    $this->second = $parser->expression();
    $parser->advance(')');
    $parser->skip_terminators();
    return $this;
  }

  public function led_equals($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression(9);
    $parser->scope->assignment($this->first, $this->second);
    return $this;
  }

  public function std_for($parser) {
    $parser->advance('(');

    if($parser->peek('var')) {
      $token = $parser->token;
      $parser->advance('var');
      $this->first = $token->std($parser);
      if ($parser->peek('in')) {
        $parser->advance('in');
        $this->second = $parser->expression();
      }
    }
    else {
      // Don't forget that expressionless for(;;) loops are valid
      $this->first = $parser->peek(';') ? NULL : $parser->statements(array(')', ';'));
    }

    if (!$parser->peek(')')) {
      // var can possibly swallow the ;
      if ($parser->peek(';')) {
        $parser->advance(';');
      }
      $this->second = $parser->peek(';') ? NULL : $parser->statements(array(';'));
      $parser->advance(';');
      $this->thid = $parser->peek(')') ? NULL : $parser->statements(array(')'));
    }
    $parser->advance(')');
    if ($parser->peek('{')) {
      $this->block = $this->block($parser);
    }
    elseif (!$parser->peek(';')) {
      $this->block = $parser->expression();
    }

    $parser->skip_terminators();

    $this->arity = 'statement';
    return $this;
  }

  public function nud_function($parser) {
    $arguments = array();
    $parser->new_scope();
    $this->scope = $parser->scope;
    if ($parser->token->arity == 'name') {
      $parser->scope->define($parser->token);
      $this->name = $parser->token->value;
      $parser->advance();
    }
    $parser->advance('(');
    if (!$parser->peek(')')) {
      while (1) {
        if ($parser->token->arity != 'name') {
          throw new Exception('Expected a parameter name');
        }
        $parser->scope->define($parser->token);
        $argument = $parser->token;
        $parser->advance();
        $argument->comments = array_merge($parser->comments_before($argument), $parser->comments_after($argument));
        $arguments[] = $argument;
        if (!$parser->peek(',')) {
          break;
        }
        $parser->advance(',');
      }
    }

    $this->first = $arguments;
    $parser->advance(')');
    $parser->peek('{');
    $this->comments = $parser->comments_after($parser->token);
    $parser->advance('{');
    $this->second = $parser->statements(array('}'));
    $parser->advance('}');
    $this->arity = 'function';
    $parser->scope_pop();

    return $this;
  }

  public function std_if($parser) {
    $parser->advance('(');
    $this->first = $parser->expression();
    $parser->advance(')');
    if ($parser->peek('{')) {
      $this->second = $this->block($parser);
    }
    elseif (!$parser->peek(';')) {
      $this->second = $parser->expression();
    }

    $parser->skip_terminators();
    
    if ($parser->peek('else')) {
      $parser->advance('else');
      if ($parser->peek('if')) {
        $this->third = $parser->statement;
      }
      elseif ($parser->peek('{')) {
        $this->third = $this->block($parser);
      }
      elseif (!$parser->peek(';')) {
        $this->third = $parser->expression();
      }

      $parser->skip_terminators();
    }
    else {
      $this->third = NULL;
    }
    $this->arity = 'statement';
    return $this;
  }

  public function executed_function($function, $parser) {
    // The function gets executed
    if ($parser->peek('(')) {
      // led_parenthesis might have already swallowed it
      $parser->advance('(');
    }

    $arguments = array();
    if (!$parser->peek(')')) {
      while (1) {
        $arguments[] = $parser->expression();
        if (!$parser->peek(',')) {
          break;
        }
        $parser->advance(',');
      }
    }
    $parser->advance(')');
    $parser->skip_terminators();

    // Make assignments within the function scope (in $function)
    // between the arguments in the expression and the passed arguments
    foreach ($function->first as $i => $parameter) {
      if ($arguments[$i]) {
        // The passed argument is assigned immediately to the matching parameter
        $function->scope->assignment($parameter, $arguments[$i]);
      }
    }

    $this->first = $function;
    $this->second = $arguments;
    $this->arity = 'execution';
    return $this;
  }

  public function led_parenthesis($parser, $left) {
    if ($left->id == 'function') {
      return $this->executed_function($left, $parser);
    }

    if ($left->id == '{') {
      $expression = $parser->expression();
      $parser->advance(')');
      return $expression;
    }

    if (!$parser->peek(')')) {
      while (1) {
        $arguments[] = $parser->expression();
        if (!$parser->peek(',')) {
          break;
        }
        $parser->advance(',');
      }
    }

    if ($left->arity == 'operator' && $left->id != '.' && $left->id != '[' && count($arguments) == 1) {
      $arguments = $arguments[0];
    }

    // e.g. foo(bar) has a foo first, [bar] second
    $this->arity = 'binary';
    $this->first = $left;
    $this->second = $arguments;

    $parser->advance(')');
    return $this;
  }

  public function nud_parenthesis($parser) {
    // '(' can mean function call, or executed function
    $is_function = $parser->peek('function');
    $expressions = array();
    while (1) {
      $expressions[] = $parser->expression();
      if ($parser->peek(')')) {
        break;
      }
      $parser->advance(',');
    }
    $parser->advance(')');

    if ($is_function && $parser->peek('(')) {
      return $this->executed_function($expressions[0], $parser);
    }

    return $expressions;
  }

  public function led_period($parser, $left) {
    $this->first = $left;
    if ($parser->token->arity != 'name') {
      throw new Exception('Expected a property name');
    }
    $parser->token->arity = 'literal';
    $this->second = $parser->token;
    $this->arity ='binary';
    $parser->advance();
    return $this;
  }

  public function led_questionmark($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression();
    $parser->advance(':');
    $this->third = $parser->expression();
    $this->arity = 'ternary';
    return $this;
  }

  public function nud_this($parser) {
    $parser->scope->reserve($this);
    $this->arity = 'this';
    return $this;
  }

  public function std_try($parser) {
    $this->first = $this->block($parser);

    if ($parser->peek('catch')) {
      $parser->advance('catch');
      $catch = $parser->new_symbol('catch');
      $parser->advance('(');
      $catch->first = $parser->expression();
      $parser->advance(')');
      $catch->second = $this->block($parser);

      $this->second = $catch;
    }

    if ($parser->peek('finally')) {
      $parser->advance('finally');
      $this->third = $this->block($parser);
    }

    $parser->skip_terminators();

    $this->arity = 'statement';

    return $this;
  }

  public function std_return($parser) {
    if (!$parser->peek("\n") && !$parser->peek(';') && !$parser->peek('}')) {
      $this->first = $parser->expression();
    }
    $parser->skip_terminators();
    $this->arity = 'statement';
    return $this;
  }

  public function std_switch($parser) {
    // switch statements can have multiple
    // levels of passthrough and expressions
    // need to be aggregated for each current
    // case statement until a break is reached
    $branches = array();

    $parser->advance('(');
    $this->first = $parser->expression();
    $parser->advance(')');
    $parser->advance('{');
    $this->second = array();

    $cases = array();
    while (1) {
      if ($parser->peek('}')) {
        break;
      }

      if ($parser->peek('default')) {
        $cases[] = $parser->token;
        $switch = 'default';
        $parser->advance('default');
      }
      else {
        $cases[] = $parser->token;
        $parser->advance('case');
        $switch = 'case';
        $cases[] = $parser->expression();
      }

      $parser->advance(':');
      $statements = $parser->statements(array('default', 'case', '}'));

      if ($switch == 'default') {
        $default = $parser->new_symbol('default');
        $default->first = $statements;
        $cases[] = $default;
      }
      elseif ($switch == 'case' && !empty($statements)) {
        $case = $parser->new_symbol('case');
        $case->first = $statements;
        $cases[] = $case;
      }
    }

    $this->second = $cases;
    $parser->advance('}');
    $this->arity = 'statement';

    return $this;
  }

  public function std_var($parser) {
    $assignments = array();
    while (1) {
      $parser->peek();
      $token = $parser->token;
      if ($token->arity != 'name') {
        throw new Exception("Line {$token->line_number}, char {$token->char_pos}: Expected a new variable name");
      }
      $parser->scope->define($token);
      $parser->advance();
      if ($parser->peek('=')) {
        $t = $parser->token;
        $parser->advance('=');
        $t->first = $token;
        $t->second = $parser->expression();
        $parser->scope->assignment($t->first, $t->second);
        $t->arity = 'binary';
        $assignments[] = $t;
      }
      else {
        $t = $parser->new_symbol('=');
        $t->first = $token;
        $t->second = NULL;
        $assignments[] = $t;
      }
      if (!$parser->peek(',')) {
        break;
      }
      $parser->advance(',');
    }
    $parser->skip_terminators();
    return $assignments;
  }

  public function std_while($parser) {
    $parser->advance('(');
    $this->first = $parser->statements(array(')'));
    $parser->advance(')');
    if ($parser->peek('{')) {
      $this->second = $this->block($parser);
    }
    else {
      $this->second = $parser->expression();
    }
    $parser->skip_terminators();
    $this->arity = 'statement';
    return $this;
  }
}
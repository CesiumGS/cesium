<?php

require_once('Scope.php');
require_once('Symbol.php');
require_once('Destructable.php');

abstract class Parser extends Destructable {
  private static $symbol_tables = array();

  protected $scopes = array();
  protected $tokens;
  protected $token_pos = 0;
  protected $token_length = 0;
  private $symbol_table;

  public $token;
  public $scope;

  abstract protected function build();
  protected $symbol_class = Symbol;

  public function __construct($tokens) {
    $id = get_class($this);
    if (empty(self::$symbol_tables[$id])) {
      $this->symbol_table = array();
      $this->build();
      self::$symbol_tables[$id] = $this->symbol_table;
    }
    $this->symbol_table = self::$symbol_tables[$id];
    $this->scopes[] = $this->scope = new Scope();
    $this->tokens = $tokens;
    $this->token_length = count($tokens);
  }

  public function __destruct() {
    $this->mem_flush('scopes', 'tokens', 'token', 'scope');
  }

  public function skip_terminators() {
    while ($this->peek(';')) {
      $this->advance(';');
    }
  }

  /**
   * Quick error check as we advance through the tokens
   *
   * @param string $id Check that the current token is what's expected
   */
  public function advance($id = NULL) {
    if ($id && !$this->peek($id)) {
      throw new Exception("Line {$this->token->line_number}, character {$this->token->char_pos}: Expected '$id' but got {$this->token->id}:'{$this->token->value}'");
    }

    $this->token = $this->next();

    while ($this->token->value == "\n") {
      // We can ignore line-breaks that are mid-expression
      $this->token = $this->next();
    }
  }

  /**
   * Look at the next non-whitespace token for a value. Also needed
   * for std functions to move up to the next non-whitespace character
   */
  public function peek($id = NULL) {
    if ($id && !is_array($id)) {
      $id = array($id);
    }
    if ($id && in_array("\n", $id) && $this->token->value == "\n") {
      return true;
    }
    while ($this->token->value == "\n") {
      // We can ignore line-breaks that are mid-expression
      $this->token = $this->next();
    }
    return $id ? in_array($this->token->id, $id) : NULL;
  }

  public function peek2($id) {
    if (!is_array($id)) {
      $id = array($id);
    }

    for ($i = $this->token_pos; $i < $this->token_length; $i++) {
      $token = $this->tokens[$i];
      if (in_array("\n", $id) && $token['value'] == "\n") {
        return true;
      }
      if ($token['type'] != 'string' && $token['value'] != "\n") {
        return in_array($token['value'], $id);
      }
    }
  }

  /**
   * Grab all statements
   */
  public function statements($terminators = array()) {
    if (!$this->token_pos) {
      $this->advance();
    }

    $terminators[] = '(end)';

    $statements = array();
    while (1) {
      // Statements occur within {} blocks as well
      if ($this->peek($terminators)) {
        break;
      }
      if ($statement = $this->statement($terminators)) {
        $statements[] = $statement;
      }
    }
    return $statements;
  }

  /**
   * Grab a single statement
   */
  public function statement($exclude = array()) {
    $skip = array_diff(array(';', "\n", ','), $exclude);
    while (in_array($this->token->id, $skip)) {
      $this->advance($this->token->id);
    }

    $token = $this->token;
    if ($token->std) {
      $this->token = $this->next(); // Line breaks are *really* important to some statements
      $this->scope->reserve($token);
      return $token->std($this);
    }
    $expression = $this->expression();

    while (in_array($this->token->id, $skip)) {
      $this->advance($this->token->id);
    }

    return $expression;
  }

  private function comments_from_pos($i) {
    $last = NULL;
    $comments = array();
    for (; $i < $this->token_length; $i++) {
      $token = $this->tokens[$i];
      if ($token['type'] == 'comment') {
        $comments[] = $token['value'];
      }
      elseif ($token['value'] != "\n") {
        break;
      }
      elseif ($last == "\n") {
        $comments[] = '';
      }
      $last = $token['value'];
    }
    return $comments;
  }

  public function comments_before($symbol) {
    if (!isset($symbol->token_pos)) {
      throw new Exception('Need valid token to look up comments');
    }

    $comments = FALSE;
    for ($i = $symbol->token_pos - 1; $i > 0; $i--) {
      $token = $this->tokens[$i];
      if ($token['type'] == 'comment') {
        $comments = TRUE;
      }
      elseif ($token['value'] != "\n") {
        if ($comments) {
          return $this->comments_from_pos($i + 1);
        }
        break;
      }
    }

    return array();
  }

  public function comments_after($symbol) {
    if (!isset($symbol->token_pos)) {
      throw new Exception('Need valid token to look up comments');
    }

    return $this->comments_from_pos($symbol->token_pos + 1);
  }

  /**
   * Simply advance through the tokens
   */
  public function next() {
    if ($this->token_pos < $this->token_length) {
      $token = $this->tokens[$this->token_pos++];

      $value = $token['value'];
      $type = $arity = $token['type'];

      if ($arity == 'string' || $arity == 'number' || $arity == 'regex') {
        $arity = 'literal';
        $s = $this->new_symbol('(literal)');
      }
      elseif ($s = $this->new_symbol($value)) {
        // short circuit
      }
      elseif ($arity == 'name') {
        $s = $this->scope->find($value, $this->symbol_table);
      }
      elseif ($arity == 'comment') {
        return $this->next();
      }
      else {
        throw new Exception("Line {$token['line_number']}, char {$token['char_pos']}: Unknown operator ($arity:'$value')");
      }

      $s->token_pos = $this->token_pos - 1;
      $s->line = $token['line'];
      $s->line_number = $token['line_number'];
      $s->char_pos = $token['char_pos'];
      $s->value = $value;
      $s->arity = $arity;
      $s->type = $type;

      return $s;
    }

    return $this->new_symbol('(end)');
  }

  /**
   *  Creates a new scope, setting the old one as its parent
   */
  public function new_scope() {
    $this->scopes[] = $scope = new Scope();
    $scope->setParent($this->scope);
    return ($this->scope = $scope);
  }

  /**
   * Reassigns the parents scope
   */
  public function scope_pop() {
    return ($this->scope = $this->scope->parent());
  }

  /**
   * Moves through tokens with higher binding powers
   * than the passed binding power
   *
   * @param int $bp
   */
  public function expression($bp = 0) {
    $token = $this->token;
    $this->advance();
    while ($this->token->value == "\n") {
      // We can ignore line-breaks that are mid-expression
      $token = $this->token;
      $this->advance();
    }
    $left = $token->nud($this);
    while ($bp < $this->token->lbp($this, $left)) {
      $token = $this->token;
      $this->advance();
      $left = $token->led($this, $left);
    }

    return $left;
  }

  public function new_symbol($id, $raw = FALSE) {
    $symbol = $this->symbol_table[$id];
    if ($symbol) {
      if ($raw) {
        return $symbol;
      }
      $symbol = clone $symbol;
      $symbol->scope = $this->scope;
      return $symbol;
    }
  }

  /**
   * Takes a symbol ID and a left binding power
   * and returns a Symbol instance
   *
   * @param string $id
   * @param int $b 
   */
  protected function symbol($id, $bp = 0) {
    if (($s = $this->symbol_table[$id]) && is_numeric($s->lbp)) {
      $s->lbp = max($bp, $s->lbp);
    }
    else {
      $s = new $this->symbol_class();
      $s->id = $id;
      $s->lbp = $bp;
      $this->symbol_table[$id] = $s;
    }
    return $s;
  }

  /**
   * Creates a symbol with a left denotation function
   * that will save the current symbol in its left property
   * and the rest of the expression on its right
   *
   * @param string $id
   * @param int $bp
   * @param string $ld String to use for the left_denotation function
   */
  protected function infix($id, $bp, $led = NULL) {
    $symbol = $this->symbol($id, $bp);
    if ($led) {
      $symbol->led = $led;
    }
    else {
      $symbol->led = 'led_infix';
      $symbol->bp = $bp;
    }
    return $symbol;
  }

  /**
   * Creates a symbol with a left denotation function
   * that will save symbols "below" it
   *
   * @param string $id
   * @param int $bp
   * @param string $led String to use for the left_denotation function
   */
  protected function infixr($id, $bp, $led = NULL) {
    $symbol = $this->symbol($id, $bp);
    if ($led) {
      $symbol->led = $led;
    }
    else {
      $symbol->led = 'led_infixr';
      $symbol->bp = $bp;
    }
    return $symbol;
  }

  /**
   * Create a symbol with a null denotation function
   * that will set its left property to what its
   * modifying
   *
   * @param string $id
   * @param string $nud String to use for the null_denotation function
   */
  protected function prefix($id, $nud = NULL) {
    $symbol = $this->symbol($id);
    $symbol->nud = $nud ? $nud : 'nud_prefix';
    return $symbol;
  }

  protected function itself($id) {
    return $this->prefix($id, 'nud_itself');
  }

  /**
   * Creates a symbol with a null denotation function that
   * makes sure it's being assigned to a variable
   * and sets its left property to what's being assigned
   * to it. Also marks its assignment value to true
   *
   * @param string $id
   */
  protected function assignment($id) {
    return $this->infixr($id, 10, 'led_assignment');
  }

  /**
   * Creates a symbol with a null denotation function
   * that turns a name token into a literal token
   * by marking it reserved in the current scope
   * and setting its value to a language-level literal
   *
   * @param string $id
   * @param anything $null_denotation String to use for the null_denotation function
   */
  protected function constant($name, $value) {
    $symbol = $this->symbol($name);
    $symbol->nud = 'nud_constant';
    $symbol->value = $value;
    $symbol->arity = 'constant';
    return $symbol;
  }

  /**
   * Creates a symbol with a statement denotation function
   * passed to it.
   *
   * @param string $id
   * @param string $std String to use for the statement_denotation function
   */
  protected function stmt($id, $std) {
    $symbol = $this->symbol($id);
    $symbol->std = $std;
    $symbol->nud = $std; // This makes statement nesting (with no block) possible
    return $symbol;
  }
}
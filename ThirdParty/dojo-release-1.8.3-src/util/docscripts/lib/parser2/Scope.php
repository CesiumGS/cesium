<?php

require_once('Destructable.php');

class Scope extends Destructable {
  protected $_parent;
  protected $definitions = array();
  protected $assignments = array();

  public function __destruct() {
    $this->mem_flush('_parent', 'definitions', 'assignments');
  }

  /**
   * Turns a name symbol into a variable symbol
   *
   * @param Symbol $symbol A name object occurring in the current scope
   */
  public function define(&$symbol) {
    if ($token = $this->definitions[$symbol->value] && $token->reserved) {
      throw new Exception("Already defined: {$symbol->value}");
    }

    $this->definitions[$symbol->value] = $symbol;
    $symbol->reserved = FALSE;
    $symbol->nud = 'nud_itself';
    $symbol->led = NULL;
    $symbol->std = NULL;
    $symbol->lbp = 0;
    $symbol->scope = $this;
    $symbol->global_scope = empty($this->_parent);

    return $symbol;
  }

  /**
   * Mark an assignment made in the current scope between two symbols
   *
   * @param Symbol $to_expression The expression $expression is assigned to
   * @param Symbol $expression The expression being assigned
   */
  public function assignment($to_expression, $expression) {
    // Only let through assignments to actual lookups (foo or foo.bar.baz)
    // where the assignment is also a lookup, or an object (which may contain lookups)
    if (is_object($to_expression) && $to_expression->is_lookup()) {
      if ($this !== $to_expression->scope) {
        // The assignment might be referencing a higher scope (e.g. without var)
        return $to_expression->scope->assignment($to_expression, $expression);
      }

      $this->assignments[$to_expression->value] = array();

      $expressions = array($expression);
      if ($possibilities = $this->possibilities($expression)) {
        $expressions = $possibilities;
      }
      foreach ($expressions as $expression) {
        if (is_object($expression) && ($expression->is_lookup() || $expression->id == '{')) {
          $this->assignments[$to_expression->value][] = $expression;
        }
      }
    }
  }

  protected function possibilities($symbol, $possibilities=array()) {
    $symbols = $symbol;
    if (!is_array($symbols)) {
      $symbols = array($symbols);
    }
    foreach ($symbols as $symbol) {
      if (is_array($symbol)) {
        $possibilities = $this->possibilities($symbol, $possibilities);
      }
      elseif ($symbol->is_option()) {
        $firsts = $symbol->first;
        if (!is_array($firsts)) {
          $firsts = array($firsts);
        }
        foreach ($firsts as $first) {
          if (is_array($first)) {
            $possibilities = $this->possibilities($first, $possibilities);
          }
          elseif ($first->possible_variable()) {
            $possibilities[] = $first;
          }
        }

        $seconds = $symbol->second;
        if (!is_array($seconds)) {
          $seconds = array($seconds);
        }
        foreach ($seconds as $second) {
          if (is_array($second) || $second->is_option()) {
            $possibilities = $this->possibilities($second, $possibilities);
          }
          elseif ($second->possible_variable()) {
            $possibilities[] = $second;
          }
        }
      }
    }
    return $possibilities;
  }

  public function assigned($variable, $as_array=FALSE) {
    if (isset($this->assignments[$variable])) {
      return $as_array ? $this->assignments[$variable] : $this->assignments[$variable][0];
    }
    if (isset($this->parent)) {
      return $this->_parent->assigned($variable, $as_array);
    }
  }

  /**
   * Sets the current scope's parent
   *
   * @param Scope $parent
   */
  public function setParent($parent) {
    if ($parent instanceof Scope) {
      return ($this->_parent = $parent);
    }
  }

  /**
   * Returns the current parent
   */
  public function parent() {
    // This is how pop() will work as well
    return $this->_parent;
  }

  public function definition($name) {
    return $this->definitions[$name];
  }

  /**
   * Tries to look up through each scope
   * to find a symbol with the same name
   * and returns the global symbol or empty
   * (name) symbol instead
   */
  public function find ($name, $symbol_table) {
    if ($symbol_table[$name]) {
      return clone $symbol_table[$name];
    }

    $scope = $this;
    while (1) {
      if ($symbol = $scope->definition($name)) {
        return clone $symbol;
      }
      if (!$scope->parent()) {
        if (array_key_exists($name, $symbol_table)) {
          return $symbol_table[$name];
        }
        $symbol = $symbol_table['(name)'];
        $s = clone $symbol;
        $s->global_scope = TRUE;
        $s->reserved = FALSE;
        $s->nud = 'nud_itself';
        $s->led = NULL;
        $s->std = NULL;
        $s->lbp = 0;
        $s->scope = $scope;
        return $s;
      }
      $scope = $scope->parent();
    }
  }

  /**
   * Marks a variable symbol as being reserved in the current scope
   *
   * @param Symbol @symbol The variable symbol to mark reserved
   */
  public function reserve($symbol) {
    if ($symbol->arity != 'name' || $symbol->reserved) {
      return;
    }

    if ($token = $this->definitions[$symbol->value]) {
      if ($token->reserved) {
        $symbol->reserved = TRUE;
        if (!$this->parent()) {
          $symbol->global_scope = TRUE;
        }
        return;
      }
      if ($token->arity == 'name') {
        throw new Exception("Already defined: {$symbol->value}");
      }
    }

    $symbol->reserved = TRUE;
    if (!$this->parent()) {
      $symbol->global_scope = TRUE;
    }
    $this->definitions[$symbol->value] = $symbol;
  }
}
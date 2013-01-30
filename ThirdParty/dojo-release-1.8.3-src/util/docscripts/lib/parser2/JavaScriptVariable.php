<?php

require_once('Destructable.php');

class JavaScriptVariable extends Destructable {
  protected $variable;
  protected $resolved_variables;
  protected $global_scope;

  public function __construct($variable, $instantiated = FALSE) {
    $this->variable = $variable;
  }

  public function __destruct() {
    $this->mem_flush('variable', 'resolved_variables', 'global_scope');
  }

  private function resolve() {
    if (!$this->variable->is_lookup()) {
      $this->global_scope = FALSE;
      $this->resolved_variables = array();
    }
    else {
      foreach ($this->variable->resolve(TRUE) as $resolved) {
        list($global_scope, $variable) = $resolved;
        if ($global_scope) {
          $this->global_scope = TRUE;
        }
        $this->resolved_variables[] = $variable;
      }
    }
  }

  public function value() {
    if (!isset($this->resolved_variables)) {
      $this->resolve();
    }
    return count($this->resolved_variables) ? $this->resolved_variables[0] : NULL;
  }

  public function values() {
    if (!isset($this->resolved_variables)) {
      $this->resolve();
    }
    return is_array($this->resolved_variables) ? $this->resolved_variables : array();
  }

  public function type() {
    // TODO: Things that receive this value should reassign to aliases as appropriate
    return 'variable';
  }

  public function is_global () {
    if (!isset($this->global_scope)) {
      $this->resolve();
    }
    return !!$this->global_scope;
  }

  public function __toString() {
    return '(' . $this->type() . ')';
  }
}
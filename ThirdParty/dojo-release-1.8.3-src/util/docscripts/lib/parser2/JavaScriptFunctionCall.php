<?php

require_once('JavaScriptStatements.php');
require_once('JavaScriptArray.php');
require_once('Destructable.php');

class JavaScriptFunctionCall extends Destructable {
  protected $call;
  protected $args;

  protected $assignment;
  protected $resolved_args;
  protected $name;
  protected $global_scope;

  public function __construct($call, $args, $instantiated = FALSE) {
    $this->call = $call;
    $this->args = $args;
  }

  public function __destruct() {
    $this->mem_flush('call', 'args', 'assignment', 'resolved_args', 'name', 'global_scope');
  }

  private function resolve() {
    if (!$this->call->is_lookup()) {
      $this->global_scope = FALSE;
      $this->name = NULL;
    }
    else {
      list ($this->global_scope, $this->name) = $this->call->resolve();
    }
  }

  public function name() {
    if (!isset($this->name)) {
      $this->resolve();
    }
    return $this->name;
  }

  public function setAssignment($assignment) {
    $this->assignment = $assignment;
  }

  public function assignment() {
    if ($this->assignment) {
      if ($this->assignment->is_lookup()) {
        list(, $assignment) = $this->assignment->resolve();
        return $assignment;
      }
    }
    return NULL;
  }

  public function is_global () {
    if (!isset($this->global_scope)) {
      $this->resolve();
    }
    return !!$this->global_scope;
  }

  public function type() {
    // TODO: Try to resolve return type
    return 'Object';
  }

  public function arguments() {
    if (isset($this->resolved_args)) {
      return $this->resolved_args;
    }
    return ($this->resolved_args = new JavaScriptArray($this->args));
  }
}
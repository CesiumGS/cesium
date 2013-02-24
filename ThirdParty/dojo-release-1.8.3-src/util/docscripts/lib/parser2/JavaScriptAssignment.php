<?php

require_once('JavaScriptVariable.php');

class JavaScriptAssignment extends JavaScriptVariable {
  protected $value;
  protected $resolved_value;

  public function __construct($variable, $value) {
    parent::__construct($variable);
    $this->value = $value;
  }

  public function __destruct() {
    $this->mem_flush('value', 'resolved_value');
  }

  public function name() {
    return parent::value();
  }

  public function names() {
    return parent::values();
  }

  public function value() {
    if (!isset($this->resolved_value)) {
      $value = $this->value;
      if (is_array($value) && count($value) == 1) {
        $value = $value[0];
      }
      $this->resolved_value = $value->convert();
    }
    return $this->resolved_value;
  }

  public function types() {
    $value = $this->value();
    if (is_array($value)) {
      $mapped = array();
      foreach ($value as $item) {
        $mapped[] = $item->type();
      }
      return $mapped;
    }
    return array($value->type());
  }

  public function type() {
    $types = array_diff($this->types(), array('variable'));
    if (count($types) == 1) {
      return array_pop($types);
    }
    return '';
  }
}
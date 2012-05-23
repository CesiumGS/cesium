<?php

class JavaScriptOr extends JavaScriptVariable {
  protected $ors;

  public function __construct($ors) {
    if (!is_array($ors)) {
      throw new Exception('JavaScriptOr expects to be passed an array');
    }
    $this->ors = $ors;
  }

  public function __destruct() {
    $this->mem_flush('ors');
  }

  public function types() {
    $mapped = array();
    foreach ($this->ors as $item) {
      $mapped[] = $item->type();
    }
    return $mapped;
  }

  public function type() {
    $types = array_diff($this->types(), array('variable'));
    if (count($types) == 1) {
      return array_pop($types);
    }
    // Assume that if one of them is a boolean, they all are
    if (in_array('bool', $types)) {
      return 'bool';
    }

    return 'Object';
  }
}
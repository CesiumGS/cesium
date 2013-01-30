<?php

require_once('Destructable.php');

class JavaScriptObject extends Destructable {
  protected $statement;
  protected $keys;

  public function __construct($statement) {
    $this->statement = $statement;
  }

  public function __destruct() {
    $this->mem_flush('statement', 'keys');
  }

  public function type() {
    return 'Object';
  }

  public function comments() {
    return $this->statement->comments;
  }

  public function values() {
    if (isset($this->keys)) {
      return $this->keys;
    }

    $keys = array();
    foreach ($this->statement->first as $value) {
      if (is_array($value)) {
        $value = $value[0];
      }
      $keys[$value->key][] = $value->convert();
    }

    return ($this->keys = $keys);
  }

  public function __toString() {
    return '(' . $this->type() . ')';
  }
}
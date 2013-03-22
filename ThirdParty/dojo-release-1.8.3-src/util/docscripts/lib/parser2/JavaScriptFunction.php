<?php

require_once('Destructable.php');

class JavaScriptFunction extends Destructable {
  protected $statement;

  public function __construct($statement, $instantiated = FALSE) {
    $this->statement = $statement;
  }

  public function __destruct() {
    $this->mem_flush('statement');
  }

  public function type() {
    return 'Function';
  }

  public function comments() {
    return $this->statement->comments;
  }

  public function body() {
    return $this->statement->second;
  }

  public function parameters() {
    $parameters = array();
    foreach ($this->statement->first as $parameter) {
      $parameters[] = (object)array(
        'name' => $parameter->value,
        'comments' => $parameter->comments
      );
    }
    return $parameters;
  }

  public function __toString() {
    return '(' . $this->type() . ')';
  }
}
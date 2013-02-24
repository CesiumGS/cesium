<?php

require_once('JavaScriptStatements.php');
require_once('JavaScriptVariable.php');
require_once('JavaScriptLiteral.php');
require_once('JavaScriptString.php');
require_once('JavaScriptNumber.php');
require_once('JavaScriptRegExp.php');
require_once('JavaScriptFunction.php');
require_once('JavaScriptObject.php');
require_once('Destructable.php');

class JavaScriptArray extends Destructable {
  protected $args;
  protected $resolved_args;
  public $length;

  public function __construct($args) {
    $this->length = count($args);
    $this->args = $args;
  }

  public function __destruct() {
    $this->mem_flush('args', 'resolved_args');
  }

  public function type() {
    return 'Array';
  }

  public function get($position) {
    $args = $this->all();
    return $args[$position];
  }

  private function getType($position, $type) {
    $args = $this->all();
	if ($args[$position] && get_class($args[$position]) == $type) {
      return $args[$position];
    }
  }

  public function getVariable($position, $is_global = FALSE) {
    if ($variable = $this->getType($position, 'JavaScriptVariable')) {
      return (!$is_global || $variable->is_global()) ? $variable->value() : NULL;
    }
    if ($variable = $this->getType($position, 'JavaScriptLiteral')) {
      return $is_global ? NULL : $variable->value();
    }
  }

  public function getString($position) {
    if ($string = $this->getType($position, 'JavaScriptString')) {
      return $string->value();
    }
  }

  public function getNumber($position) {
    if ($number = $this->getType($position, 'JavaScriptNumber')) {
      return $number->value();
    }
  }

  public function getRegExp($position) {
    if ($regexp = $this->getType($position, 'JavaScriptRegExp')) {
      return $regexp->value();
    }
  }

  public function getFunction($position) {
    return $this->getType($position, 'JavaScriptFunction');
  }

  public function getArray($position) {
    return $this->getType($position, 'JavaScriptArray');
  }

  public function getObject($position) {
    return $this->getType($position, 'JavaScriptObject');
  }

  public function all() {
    if (isset($this->resolved_args)) {
      return $this->resolved_args;
    }

    $args = array();
    foreach ($this->args as $arg) {
      if (is_object($arg)) {
        $args[] = $arg->convert();
      }
    }

    return ($this->resolved_args = $args);
  }
}

?>

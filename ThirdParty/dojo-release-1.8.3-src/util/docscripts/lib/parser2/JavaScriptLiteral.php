<?php

require_once('Destructable.php');

class JavaScriptLiteral extends Destructable {
  protected $value;

  public function __construct($value) {
    $this->value = $value;
  }

  public function __destruct() {
    $this->mem_flush('value');
  }

  public function value() {
    return $this->value;
  }

  public function type() {
    if (is_object($this->value)) {
      if ($this->value->arity == 'this') {
        return 'Object';
      }
      elseif (strlen($this->value->id) > 1 && in_array($this->value->id{0}, array('!', '=', '<', '>'))) {
        return 'bool';
      }
      elseif (in_array($this->value->id, array('!', '>', '<', '&', '|'))) {
        return 'bool';
      }
      elseif ($this->value->id == '+' && !is_numeric($this->value->second->value)) {
        return 'String';
      }
      elseif (in_array($this->value->id, array('++', '--', '+', '-', '*', '/', '%'))) {
        return 'Number';
      }
      elseif ($this->value->id == '&&' || $this->value->id == '||') {
        $first = $this->value->first;
        if (is_array($first)) {
          $first = $first[0];
        }
        return $first->type();
      }
    }
    elseif (is_null($this->value) || $this->value == 'null') {
      return 'Object';
    }
    elseif (is_bool($this->value)) {
      return 'bool';
    }
    elseif ($this->value == 'arguments') {
      return 'Array';
    }
    throw new Exception("Unstringed literal type: {$this->value}");
  }
}
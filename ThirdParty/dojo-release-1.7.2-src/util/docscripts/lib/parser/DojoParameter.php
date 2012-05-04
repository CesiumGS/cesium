<?php

require_once('DojoString.php');
require_once('DojoNull.php');
require_once('DojoBoolean.php');
require_once('DojoVariable.php');
require_once('DojoObject.php');
require_once('DojoFunctionDeclare.php');
require_once('DojoBlock.php');

class DojoParameter extends DojoBlock
{
  private $object = 'DojoParameter';

  private $terminator = ')';

  private $parameter_value;
  private $parameter_type;

  public function __construct($package, $line_number = false, $position = false, $terminator = ')'){
    parent::__construct($package, $line_number, $position);
    $this->terminator = $terminator;
  }

  public function __destruct() {
    parent::__destruct();
    unset($this->parameter_value);
    unset($this->parameter_type);
  }

  public function exists(){
    return !empty($this->parameter_value);
  }

  public function isA($class){
    if (!$this->parameter_value) {
      $this->getValue();
    }
    if ($this->parameter_value instanceof $class) {
      return true;
    }
    return false;
  }

  public function build(){
    if (!$this->start) {
      debug_print_backtrace();
      die("DojoParameter->build() used before setting a start position");
    }

    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], false, false, true);
    list($line_number, $position) = Text::findTermination($lines, ',' . $this->terminator, '(){}[]');
    $this->setEnd($line_number, $position);
    return $this->end;
  }

  public function getString(){
    if ($this->isA(DojoString)) {
      return $this->parameter_value->getValue();
    }
    return '';
  }

  public function getObject(){
    if ($this->isA(DojoObject)) {
      return $this->parameter_value;
    }
    return new DojoObject($this->package);
  }

  public function getFunction(){
    if ($this->isA(DojoFunctionDeclare)) {
      $this->parameter_value->build();
      return $this->parameter_value;
    }
    return new DojoFunctionDeclare($this->package);
  }

  public function getArray(){
    if ($this->isA(DojoArray)) {
      $this->parameter_value->build();
      return $this->parameter_value;
    }
    require_once('DojoArray.php'); // Chase condition
    return new DojoArray($this->package);
  }

  public function getVariable(){
    if ($this->isA(DojoVariable)) {
      return $this->parameter_value->getValue();
    }
    return new DojoVariable('');
  }

  public function setVariable($value){
    if ($this->isA(DojoVariable)) {
      $this->parameter_value->setValue($value);
    }
  }

  public function getValue(){
    if ($this->parameter_value) {
      return $this->parameter_value;
    }

    $lines = Text::chop($this->package->getSource(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    $parameter_value = Text::trim(implode("\n", $lines));

    if ($parameter_value{0} == '"' || $parameter_value{0} == "'") {
      $this->parameter_value = new DojoString($parameter_value);
    }
    elseif ($parameter_value{0} == '{') {
      foreach ($lines as $line_number => $line) {
        if (($position = strpos($line, '{')) !== false) {
          $this->parameter_value = new DojoObject($this->package, $line_number, $position);
          break;
        }
      }
    }
    elseif (strpos($parameter_value, 'function') === 0) {
      foreach ($lines as $line_number => $line) {
        if (($position = strpos($line, 'function')) !== false) {
          $this->parameter_value = new DojoFunctionDeclare($this->package, $line_number, $position);
          break;
        }
      }
    }
    elseif ($parameter_value{0} == '[') {
      foreach ($lines as $line_number => $line) {
        if (($position = strpos($line, '[')) !== false) {
          require_once('DojoArray.php'); // Chase condition
          $this->parameter_value = new DojoArray($this->package, $line_number, $position);
          break;
        }
      }
    }
    elseif ($parameter_value == 'null' || $parameter_value == 'undefined') {
        $this->parameter_value = new DojoNull($parameter_value);
    }
    elseif ($parameter_value == 'true' || $parameter_value == 'false') {
      $this->parameter_value = new DojoBoolean($parameter_value);
    }
    elseif (!empty($parameter_value)) {
      $this->parameter_value = new DojoVariable($parameter_value);
    }

    return $this->parameter_value;
  }
  
  public function getType(){
    if ($this->parameter_type) {
      return $this->parameter_type;
    }

    $type = array();
    $lines = Text::chop($this->package->getSource(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    foreach ($lines as $line) {
      list($first, $middle, $last, $data, $multiline) = Text::findComments($line, $multiline);
      $type = array_merge($type, array($first, $middle, $last));
    }

    return $this->parameter_type = implode(' ', array_diff($type, array('')));
  }
}
  
?>
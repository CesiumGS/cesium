<?php

require_once('Destructable.php');

class JavaScriptTernary extends Destructable {
  protected $expression;
  protected $if_true;
  protected $if_false;

  public function __construct($expression, $if_true, $if_false) {
    $this->expression = $expression;
    $this->if_true = $if_true;
    $this->if_false = $if_false;
  }

  public function __destruct() {
    $this->mem_flush('expression', 'if_true', 'if_false');
  }

  public function type() {
    $trues = $this->if_true;
    if (!is_array($trues)) {
      $trues = array($trues);
    }
    foreach ($trues as $true) {
      if ($type = $true->type()) {
        return $type;
      }
    }

    $falses = $this->if_false;
    if (!is_array($falses)) {
      $falses = array($falses);
    }
    foreach ($falses as $false) {
      if ($type = $false->type()) {
        return $type;
      }
    }
    return '';
  }
}
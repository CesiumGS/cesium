<?php

require_once('JavaScriptLiteral.php');

class JavaScriptNumber extends JavaScriptLiteral {
  public function type() {
    return 'Number';
  }
}
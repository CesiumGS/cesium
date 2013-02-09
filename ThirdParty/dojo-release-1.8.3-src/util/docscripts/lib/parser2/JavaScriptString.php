<?php

require_once('JavaScriptLiteral.php');

class JavaScriptString extends JavaScriptLiteral {
  public function type() {
    return 'String';
  }
}
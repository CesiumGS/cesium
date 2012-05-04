<?php

require_once('JavaScriptLiteral.php');

class JavaScriptRegExp extends JavaScriptLiteral {
  public function type() {
    return 'RegExp';
  }
}
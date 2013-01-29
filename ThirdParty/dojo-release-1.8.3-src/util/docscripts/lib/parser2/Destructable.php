<?php

abstract class Destructable {
  protected function mem_flush() {
    foreach (func_get_args() as $key) {
      if ($this->$key) {
        if (is_object($this->$key)) {
          $this->$key->__destruct();
        }
        elseif (is_array($this->$key)) {
          foreach ($this->$key as $loc => $value) {
            if (is_object($value)) {
              $value->__destruct();
            }
          }
        }
        unset($this->$key);
      }
    }
  }
}
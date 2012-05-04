<?php

require_once('JavaScriptFunction.php');
require_once('JavaScriptFunctionCall.php');
require_once('JavaScriptAssignment.php');
require_once('Destructable.php');

class JavaScriptStatements extends Destructable {
  protected $statements;
  protected $function_calls;
  protected $function_assignments;
  protected $prefixes = array();

  public function __construct($statements) {
    if (!is_array($statements)) {
      $statements = array($statements);
    }
    $this->statements = $statements;
  }

  public function __destruct() {
    $this->mem_flush('statements', 'function_calls', 'function_assignments', 'prefixes');
  }

  public function function_calls($global_scope = FALSE, $name = NULL) {
    $calls = $this->function_calls = isset($this->function_calls) ? $this->function_calls : $this->resolve_something('resolve_function_calls');
    if ($name) {
      $names = array_slice(func_get_args(), 1);
      $filtered = array();
      foreach ($names as $name) {
        foreach ($calls as $call) {
          if ($call->name() == $name) {
            $filtered[] = $call;
          }
        }
      }
      $calls = $filtered;
    }
    if ($global_scope) {
      $filtered = array();
      foreach ($calls as $call) {
        if ($call->is_global()) {
          $filtered[] = $call;
        }
      }
      $calls = $filtered;
    }
    return $calls;
  }

  private function resolve_function_calls($statement, $parent) {
    if (is_object($statement) && $statement->id == '(' && $statement->arity == 'binary' && (is_object($statement->first) && $statement->first->is_lookup())) {
      $call = new JavaScriptFunctionCall($statement->first, $statement->second);
      if ($parent->id == '=') {
        $name = $parent->first;
        while ($name) {
          if ($name && $name->arity == 'name') {
            if ($name->global_scope) {
              $call->setAssignment($parent->first);
            }
            break;
          }
          $name = $name->first;
        }
      }
      return $call;
    }
  }

  public function assignments($global_scope=FALSE, $into_functions=TRUE) {
    $assignments = $this->function_assignments = isset($this->function_assignments) ? $this->function_assignments : $this->resolve_something('resolve_assignments', array(), !$into_functions);
    if ($global_scope) {
      $filtered = array();
      foreach ($assignments as $item) {
        if ($item->is_global()) {
          $filtered[] = $item;
        }
      }
      $assignments = $filtered;
    }
    return $assignments;
  }

  private function resolve_assignments($statement, $parent) {
    if ($statement->id == '=' && $statement->second) {
      return new JavaScriptAssignment($statement->first, $statement->second);
    }
  }

  public function prefix($prefix_name) {
    return isset($this->prefixes[$prefix_name]) ? $this->prefixes[$prefix_name] : $this->resolve_something('resolve_prefix', array($prefix_name));
  }

  private function resolve_prefix($statement, $parent, $prefix_name) {
    if ($statement->arity == 'statement' && $statement->value == $prefix_name) {
      return $statement;
    }
  }

  private function resolve_something($found_callback, $passed_args = array(), $seen_function=FALSE, $somethings = array(), $statements = NULL, $parent = NULL) {
    if (!$statements) {
      $statements = $this->statements;
    }

    if (!is_array($statements)) {
      $statements = array($statements);
    }

    foreach ($statements as $statement) {
      if (is_array($statement)) {
        foreach ($statement as $st) {
          if (!$seen_function || $st->id != 'function') {
            $somethings = $this->resolve_something($found_callback, $passed_args, $seen_function, $somethings, $st, NULL);
          }
        }
        continue;
      }

      if ($statement->id == 'function') {
        if ($seen_function) {
          continue;
        }
        $seen_function = TRUE;
      }

      if ($something = call_user_func_array(array($this, $found_callback), array_merge(array($statement, $parent), $passed_args))) {
        $somethings[] = $something;
      }

      if ($statement->first) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $seen_function, $somethings, $statement->first, $statement);
      }
      if ($statement->second) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $seen_function, $somethings, $statement->second, $statement);
      }
      if ($statement->third) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $seen_function, $somethings, $statement->third, $statement);
      }
      if (!empty($statement->block)) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $seen_function, $somethings, $statement->block, $statement);
      }
    }

    return $somethings;
  }
}
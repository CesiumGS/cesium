<?php

require_once('DojoBlock.php');

class DojoFunctionBody extends DojoBlock
{
  private $object = 'DojoFunctionBody';

  private $comment_end;

  public static $prefix = '';
  public static $suffix = '';

  private $keys = array();
  private $key_sets = array();
  private $comments = array();
  private $return_comments = array();
  private $instance_variables = array();
  private $resolved_parameters = array();
  private $externalized = array();
  private $externalized_objects = array();
  private $externalized_avariables = array();
  private $externalized_ivariables = array();
  private $externalized_variables = array();  
  private $externalized_mixins = array();
  private $this_inheritance_calls = array();
  private $extra_initial_comment_block = array();

  public function destroy() {
    if (!$this->destroyed) {
      $this->destroyed = true;
      array_walk($this->externalized, 'destroy_all');
      unset($this->externalized);
      array_walk($this->externalized_objects, 'destroy_all');
      unset($this->externalized_objects);
      array_walk($this->externalized_mixins, 'destroy_all');
      unset($this->externalized_mixins);
    }
  }

  public function build() {
    if (!$this->start) {
      die("DojoFunctionBody->build() used before setting a start position");
    }
    if ($this->end) {
      return $this->end;
    }

    $balance = 0;
    $start_position = $this->start[1];
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], false, false, true);
        return $this->end = Text::findTermination($lines, '}', '{}');
  }

  public function addBlockCommentLine($line) {
    $this->extra_initial_comment_block[] = $line;
  }

  public function addBlockCommentBreak() {
    $this->extra_initial_comment_block[] = -1;
  }

  public function addBlockCommentKey($key) {
    $this->comments = array();
    if ($key) {
      $this->keys[] = $key;
    }
  }

  /**
   * This key can occur multiple times. eg: example
   */
  public function addBlockCommentKeySet($key) {
    $this->comments = array();
    if ($key) {
      $this->key_sets[] = $key;
    }
  }

  public function getSource() {
    $this->getBlockCommentKeys();
    $source = array();
    $lines = Text::chop($this->package->getSource(), $this->comment_end[0], $this->comment_end[1], $this->end[0], $this->end[1]);
    if ($this->start[0] == $this->comment_end[0] && $this->start[1] == $this->comment_end[1]) {
      $lines[$this->start[0]] = substr($lines[$this->start[0]], $this->start[1] + 1);
    }
    $lines[$this->end[0]] = substr($lines[$this->end[0]], 0, $this->end[1]);
    foreach ($lines as $line_number => $line) {
      $trimmed_line = trim($line);
      if ($trimmed_line === '') {
        $source[] = '';
      }
      $source[] = $line;
    }
    while (!empty($source)) {
      if (trim($source[0]) === '') {
        array_shift($source);
        continue;
      }
      break;
    }
    while (!empty($source)) {
      if (trim($source[count($source) - 1]) === '') {
        array_pop($source);
        continue;
      }
      break;
    }
    return implode("\n", $source);
  }

  private function cleanBlock($text){
    $lines = explode("\n", trim($text));
    $output = array();
    $indented = false;
    $blank = false;
    foreach ($lines as $i => $line) {
      if ($line{0} == "|") {
        if(!$indented){
          $indented = true;
          if (!$blank) {
            $output[] = "";
            if (!$i) {
              $output[] = "";
            }
          }
        }
        $output[] = substr($line, 1);
      }
      else {
        if($indented){
          $indented = false;
          if (empty($line)) {
            if (!$blank) {
              $output[] = "";
            }
          }
        }
        if (empty($line)) {
          $blank = true;
        }
        $output[] = $line;
      }
    }
    return implode("\n", $output);
  }

  public function getBlockComment($key) {
    $this->getBlockCommentKeys();
    $value = $this->comments[$key];
    if (!empty($value)) {
      if (is_array($value)) {
        for ($i = 0; $i < count($value); $i++){
          $value[$i] = $this->cleanBlock($value[$i]);
        }
      }
      else {
        $value = $this->cleanBlock($value);
      }
    }
    return $value;
  }

  public function getBlockCommentKeys() {
    if ($this->comments) { 
      return array_keys($this->comments); 
    }

    $this->build();

    $prefix = '\b';
    if (self::$prefix) {
      $prefix = preg_quote(self::$prefix, '%');
    }
    $suffix = '\b';
    if (self::$suffix) {
      $suffix = preg_quote(self::$suffix, '%');
    }
    $expression = '%^' . $prefix . '(' . implode('|', array_merge($this->keys, $this->key_sets)) . ')' . $suffix . '\W*%';

    $lines = Text::chop($this->package->getSource(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    for ($i = 0; $i < 2; $i++) {
      $started = false;
      $between_blocks = true;
      $wait_for_break = false;
      $buffer = array();
      $key = '';
      if ($i == 1) {
        $lines = $this->extra_initial_comment_block;
      }
      foreach ($lines as $line_number =>  $line) {
        if ($line === -1) {
          // Comes from manually added lines (block breaks, e.g. between object keys)
          $between_blocks = true;
          continue;
        }

        list($comment, , , $data, $multiline) = Text::findComments($line, $multiline);

        if ($between_blocks) {
          if ($comment) {
            if (preg_match($expression, $comment)) {
              $between_blocks = false;
            }
            elseif (!$i) {
              continue 2;
            }
            else {
              $wait_for_break = true;
              continue;
            }
          }
        }
        elseif ($comment === false) {
          $between_blocks = true;
          continue;
        }

        if (preg_match($expression, $comment, $match)) {
          if ($buffer && $key) {
            if (in_array($key, $this->key_sets)) {
              $this->comments[$key][] = implode("\n", $buffer);
            }
            else {
              $this->comments[$key] = implode("\n", $buffer);
            }
            $buffer = array();
          }
          $key = $match[1];
          if ($match[0] == $comment) {
            $comment = '';
          }else{
            $comment = substr($comment, strlen($match[0]));
          }
        }

        if ($data) {
          $this->comment_end = array($line_number, 0);
          break;
        }

        $buffer[] = $comment;
      }

      if ($buffer && $key) {
        if (in_array($key, $this->key_sets)) {
          $this->comments[$key][] = implode("\n", $buffer);
        }
        else {
          $this->comments[$key] = implode("\n", $buffer);
        }
      }

      if ($i == 0 && !$this->comment_end) {
        $this->comment_end = $this->start;
      }
    }

    return array_keys($this->comments);
  }

  public function addResolvedParameter($parameter, $value) {
    $this->resolved_parameters[$parameter] = $value;
  }

  public function getLocalVariableNames() {
    $internals = array();

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    // Find simple external variable assignment.
    $matches = preg_grep('%(?:var|this)%', $lines);
    foreach ($matches as $line_number => $line) {
      // Check for var groups, or var name =
      if (preg_match('%var\s+[a-zA-Z0-9_.$]+([^;]+,\s*[a-zA-Z0-9_.$]+)*%', $line, $match)) {
        preg_match_all('%(?:var\s+([a-zA-Z_.$][\w.$]*)|,\s*([a-zA-Z_.$][\w.$]*))%', $match[0], $named_matches, PREG_SET_ORDER);
        foreach ($named_matches as $named_match) {
          if (!empty($named_match[1])) {
            $internals[$named_match[1]] = false;
          }
          if (!empty($named_match[2])) {
            $internals[$named_match[2]] = false;
          }
        }
      }
      if (preg_match('%var\s+([a-zA-Z_.$][\w.$]*)\s*=\s*([a-zA-Z_.$][a-zA-Z0-9_.$]*)\s*[;\n]%', $line, $match)) {
        if (in_array($match[2], array('null', 'true', 'false', 'this'))) continue;
        $internals[$match[1]] = $match[2];
      }
      if (preg_match('%(this\.[a-zA-Z_.$][\w.$]*)\s*=\s*([a-zA-Z_.$][\w.$]*)%', $line, $match)) {
        $internals[$match[2]] = $match[1];
      }
    }

    foreach ($this->resolved_parameters as $parameter => $value) {
      $internals[$parameter] = $value;
    }

    return $internals;
  }

  /**
   * If these occur inside this function AND reference a local variable, remove them
   */
  public function removeSwallowedMixins(&$possible_mixins) {
    // If any of the mixins happened inside of an executed function, we need to see if
    // they were used on external variables.
    if ($this->externalized_mixins) {
      return $this->externalized_mixins;
    }

    $this->build();
    $internals = $this->getLocalVariableNames();

    foreach ($possible_mixins as $i => $mixin) {
      if (($this->start[0] < $mixin->start[0] || ($this->start[0] == $mixin->start[0] && $this->start[1] < $mixin->start[1])) &&
          ($this->end[0] > $mixin->end[0] || ($this->end[0] == $mixin->end[0] && $this->end[1] > $mixin->end[1]))) {
        $parameter = $mixin->getParameter(0);
        if ($mixin->getName() == 'dojo.extend' && $parameter->isA(DojoFunctionDeclare)) {
          $code = $this->package->getCode();
          $line = substr($code[$parameter->start[0]], 0, $parameter->start[1]);
          $line = substr($line, 0, strrpos($line, $mixin->getName()));
          preg_match_all('%(?:([a-zA-Z0-9_.$\s]+)\s*=\s*)+%', $line, $matches);
          foreach ($matches[1] as $match) {
            $match = trim($match);
            if (!preg_match('%^var\s+%', $match)) {
              $found = true;
              while ($found) {
                $found = false;
                foreach ($internals as $internal_name => $external_name) {
                  if ($internal_name == 'this') continue;
                  if (strpos($match, $internal_name . '.') === 0) {
                    $last = $match;
                    $match = $external_name . substr($match, strlen($internal_name));
                    if ($last != $match) {
                      $found = true;
                    }
                  }
                }
              }
              $parameter->getFunction()->setFunctionName($match);
            }
          }
          $this->externalized_mixins[] = $mixin;
        }
        elseif ($parameter->isA(DojoVariable)) {
          $object = $parameter->getVariable();
          if ($object == "this") {
            unset($possible_mixins[$i]);
          }
          elseif (($mixin->start[0] > $this->start[0] || ($mixin->start[0] == $this->start[0] && $mixin->start[1] > $this->start[1]))
              && ($mixin->end[0] < $this->end[0] || ($mixin->end[0] == $this->end[0] && $mixin->end[1] < $this->end[1]))) {
            if (array_key_exists($object, $internals)) {
                unset($possible_mixins[$i]);
            }
            else {
              foreach ($internals as $internal_name => $external_name) {
                if (strpos($object, $internal_name . '.') === 0) {
                  $object = $external_name . substr($object, strlen($internal_name));
                }
              }

              $parameter->setVariable($object);
            }
          }
          $this->externalized_mixins[] = $mixin;
        }
        else {
          $this->externalized_mixins[] = $mixin;
          array_splice($possible_mixins, $i--, 1);
        }
      }
    }
  }

  public function getExternalizedObjects($function_name=false, $parameter_names=array()){
    if ($this->externalized_objects) {
      return $this->externalized_objects;
    }

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    foreach ($this->externalized_mixins as $mixin) {
      $lines = Text::blankOutAtPositions($lines, $mixin->start[0], $mixin->start[1], $mixin->end[0], $mixin->end[1]);
    }
    $internals = $this->getLocalVariableNames();

    $matches = preg_grep('%=\s*\{%', $lines);
    foreach ($matches as $line_number => $line) {
      if (preg_match('%(\b[a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)\s*=\s*{%', $line, $match)) {
        if (array_key_exists($match[1], $internals)) continue;

        $externalized_object = new DojoObject($this->package, $line_number, strpos($line, '{', strpos($line, $match[0])));
        $end = $externalized_object->build();

        $name = $match[1];
        if (strpos($name, 'this.') === 0) continue;

        foreach ($internals as $internal_name => $external_name) {
          if (strpos($name, $internal_name . '.') === 0) {
            if (!$external_name) continue 2;
            $name = $external_name . substr($name, strlen($internal_name));
          }
        }

        if (strpos($name, '[') !== false) {
          $source_lines = Text::chop($this->package->getSource(), $line_number, 0);
          $source_line = trim($source_lines[$line_number]);
          preg_match('%\b([a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)\s*=\s*function%', $source_line, $source_match);
          $name = preg_replace('%\["([^"]+)"\]%', '.$1', $source_match[1]);
        }

        if (strpos($name, 'this.') === 0) {
          if (!$function_name) continue;

          $name = $function_name . substr($name, 4);
        }

        if (in_array($name, $parameter_names)) {
          continue;
        }

        $externalized_object->setName($name);
        $this->externalized_objects[] = $externalized_object;
      }
    }

    return $this->externalized_objects;
  }

  public function getExternalizedFunctionDeclarations($function_name=false) {
    if ($this->externalized) {
      return $this->externalized;
    }

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    $internals = $this->getLocalVariableNames();

    $matches = preg_grep('%function\s*\(%', $lines);
    $last_line = 0;
    foreach ($matches as $line_number => $line) {
      if ($line_number < $last_line) continue;
      if (preg_match('%(var)?\s*(\b[a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]*|\["[^"]+"\])*)\s*=\s*function\s*\(%', $line, $match)) {
        if ($match[1] || array_key_exists($match[2], $internals)) continue;

        $externalized = new DojoFunctionDeclare($this->package, $line_number, strpos($line, $match[0]));
        $end = $externalized->build();
        $last_line = $end[0];

        $externalized->rebuildAliases($internals);
        $externalized->setExecutedFunction($this);

        $name = $match[2];
        if (strpos($name, 'this.') === 0) continue;

        foreach ($internals as $internal_name => $external_name) {
          if (strpos($name, $internal_name . '.') === 0) {
            if (!$external_name) continue 2;
            $name = $external_name . substr($name, strlen($internal_name));
          }
        }

        if (strpos($name, '[') !== false) {
          $source_lines = Text::chop($this->package->getSource(), $line_number, 0);
          $source_line = trim($source_lines[$line_number]);
          preg_match('%\b([a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)\s*=\s*function\b%', $source_line, $source_match);
          $name = preg_replace('%\["([^"]+)"\]%', '.$1', $source_match[1]);
        }

        if (strpos($name, 'this.') === 0) {
          if (!$function_name) continue;

          $name = $function_name . substr($name, 4);
        }

        $parts = explode('.', $name);
        if (count($parts) > 2 && array_pop(array_slice($parts, -2, 1)) == 'prototype') {
          array_splice($parts, -2, 1);
          $name = implode('.', $parts);
          array_pop($parts);
          $externalized->setPrototype(implode('.', $parts));
        }

        $externalized->setFunctionName($name);
        $this->externalized[] = $externalized;
      }
      else {
        $skipped = new DojoFunctionDeclare($this->package, $line_number, strpos($line, 'function'));
        $end = $skipped->build();
        $last_line = $end[0];
      }
    }

    return $this->externalized;
  }

  public function getExternalizedAllVariableNames($function_name, $parameter_names=array()) {
    if ($this->externalized_avariables) {
      return $this->externalized_avariables;
    }

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    $internals = $this->getLocalVariableNames();

    $declarations = $this->getExternalizedFunctionDeclarations($function_name);
    foreach ($declarations as $declaration) {
      $declaration->build();
      $lines = Text::blankOutAtPositions($lines, $declaration->start[0], $declaration->start[1], $declaration->end[0], $declaration->end[1]);
    }

    $objects = $this->getExternalizedObjects(false, $parameter_names);
    foreach ($objects as $object) {
      $object->build();
      $lines = Text::blankOutAtPositions($lines, $object->start[0], $object->start[1], $object->end[0], $object->end[1]);
    }

    $lines = $this->package->removeCodeFrom($lines);

    $variables = array();

    foreach (preg_grep('%function%', $lines) as $line) {
      if (preg_match('%function\s*\(([^)]+)\)%', $line, $match)) {
        if (preg_match_all('%[a-zA-Z_.$][\w.$]+%', $match[0], $matches)) {
          foreach ($matches[0] as $match) {
            $internals[$match] = true;
          }
        }
      }
    }

    foreach (preg_grep('%=%', $lines) as $line_number => $line) {
      if (preg_match('%^\s*var\b%', $line)) continue;
      if (preg_match('%\b([a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)\s*=(?!=)\s*(function\s*\()?%', $line, $match)) {
        if ($match[2] || array_key_exists($match[1], $internals)) continue;

        $name = $match[1];

        if (strpos($name, '[') !== false) {
          $source_lines = Text::chop($this->package->getSource(), $line_number, 0);
          $source_line = trim($source_lines[$line_number]);
          preg_match('%\b([a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)%', $source_line, $source_match);
          $name = preg_replace('%\["([^"]+)"\]%', '.$1', $source_match[1]);
        }

        if (strpos($name, 'this.') === 0) {
          if ($function_name) {
            continue;
          }
          else {
            $name = substr($name, 5);
          }
        }

        $found = true;
        while ($found) {
          $found = false;
          foreach ($internals as $internal_name => $external_name) {
            if ($internal_name == 'this') continue;
            if (strpos($name, $internal_name . '.') === 0) {
              if (!$external_name) continue 2;
              $last = $name;
              $name = $external_name . substr($name, strlen($internal_name));
              if ($last != $name) {
                $found = true;
              }
            }
          }
        }

        $variables[] = $name;
      }
    }

    return $this->externalized_avariables = $variables;
  }

  public function getExternalizedInstanceVariableNames($function_name, $parameter_names=array()) {
    if ($this->externalized_ivariables) {
      return $this->externalized_ivariables;
    }

    $ivariables = array();

    $variables = $this->getExternalizedAllVariableNames($function_name, $parameter_names);
    foreach ($variables as $variable) {
      if (strpos($variable, 'this.') === 0) {
        $ivariables[] = substr($variable, 5);
      }
    }

    return $this->externalized_ivariables = $ivariables;
  }

  public function getExternalizedVariableNames($function_name, $parameter_names=array()) {
    if ($this->externalized_variables) {
      return $this->externalized_variables;
    }

    $evariables = array();

    $variables = $this->getExternalizedAllVariableNames($function_name, $parameter_names);
    foreach ($variables as $variable) {
      if (strpos($variable, 'this.') !== 0) {
        $evariables[] = $variable;
      }
    }

    return $this->externalized_variables = $evariables;
  }

  public function getInstanceVariableNames() {
    if ($this->instance_variables) {
      return $this->instance_variables;
    }

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    foreach ($lines as $line) {
      if (preg_match('%\bthis\.([a-zA-Z0-9._$]+)\s*=\s*(?!function)%', $line, $match)) {
        $parts = explode('.', $match[1]);
        if (count($parts) && !in_array(array_pop(array_slice($parts, -1, 1)), array('prototype', 'constructor'))){
          $this->instance_variables[] = $match[1];
        }
      }
    }
    return $this->instance_variables;
  }

  public function getInstanceFunctions($function_name) {
    $functions = array();
    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    foreach ($lines as $line_number => $line) {
      if (preg_match('%\bthis\.([a-zA-Z0-9._$]+)\s*=\s*function\b%', $line, $match, PREG_OFFSET_CAPTURE)) {
        $function = new DojoFunctionDeclare($this->package, $line_number, $match[0][1]);
        $function->setFunctionName($function_name);
        $end = $function->build();
        $functions[] = $function;
      }
    }
    return $functions;
  }

  public function getReturnComments() {
    if ($this->return_comments) {
      return $this->return_comments;
    }

    $buffer = array();
    $this->getBlockCommentKeys();
    $lines = Text::chop($this->package->getSource(), $this->comment_end[0], $this->comment_end[1], $this->end[0], $this->end[1], true);
    foreach ($lines as $line) {
      if ($multiline) {
        list($first, $middle, $last, $data, $multiline) = Text::findComments($line, $multiline);
        if ($first) {
          $buffer[] = trim($first);
        }
        if ($data) {
          $multiline = false;
          if ($buffer) {
            $this->return_comments[] = implode(' ', array_diff($buffer, array('')));
            $buffer = array();
          }
        }
      }
      if (strpos($line, 'return') !== false) {
        if ($data && $buffer) {
          $this->return_comments[] = implode(' ', array_diff($buffer, array('')));
          $buffer = array();
        }
        list($first, $middle, $last, $data, $multiline) = Text::findComments($line, $multiline);
        if ($last) {
          $buffer[] = $last;
        }
      }
    }

    if ($data && $buffer) {
      $this->return_comments[] = implode(' ', array_diff($buffer, array('')));
    }

    $this->return_comment = array_unique($this->return_comments);

    return $this->return_comments;
  }

  public function getThisInheritanceCalls() {
    if ($this->this_inheritance_calls) {
      return $this->this_inheritance_calls;
    }

    $internalized = $this->getLocalVariableNames();

    $this->build();
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1], $this->end[0], $this->end[1], true);
    foreach ($lines as $line) {
      if (preg_match('%\b([a-zA-Z0-9_.$]+)\.(?:apply|call)\s*\(%', $line, $match) && !array_key_exists($match[1], $internalized)) {
        $this->this_inheritance_calls[] = $match[1];
      }
    }
    return $this->this_inheritance_calls;
  }
}

?>
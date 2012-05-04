<?php

require_once('Text.php');
require_once('DojoFunctionCall.php');
require_once('DojoExecutedFunction.php');

class DojoPackage
{
  private $dojo;
  protected $file; // The file reference (including dir) to the file;
  private $code; // The source - comments
  protected $source;
  protected $declarations = array(); // Builds an array of functions declarations by name, with meta
  protected $executions = array();
  protected $calls = array(); // Builds an array of calls
  protected $objects = array(); // Builds an array of objects
  protected $aliases = array(); // Builds a key/value list of aliases in this file

  public function __construct(Dojo $dojo, $file){
    $this->dojo = $dojo;
    $this->setFile($file);
  }

  public function destroy() {
    array_walk($this->declarations, 'destroy_all');
    unset($this->declarations);
    array_walk($this->executions, 'destroy_all');
    unset($this->executions);
    array_walk($this->calls, 'destroy_all');
    unset($this->calls);
    array_walk($this->objects, 'destroy_all');
    unset($this->objects);
    array_walk($this->aliases, 'destroy_all');
    unset($this->aliases);
  }
  
  public function getFile(){
    return $this->file;
  }
  
  public function setFile($file){
    $this->file = $file;
  }

  public function getFunctionDeclarations(){
    $lines = $this->getCode();
    $end = array(0, 0);

    $matches = preg_grep('%function%', $lines);
    $last_line = 0;
    foreach($matches as $line_number => $line){
      if($line_number < $last_line){
        continue;
      }

      if(preg_match('%(\bfunction\s+[a-zA-Z0-9_.$]+\b\s*\(|\b[a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*\s*=\s*(new\s*)?function\s*\()%', $line, $match)) {
        $declaration = new DojoFunctionDeclare($this);
        $declaration->setStart($line_number, strpos($line, $match[0]));
        $end = $declaration->build();
        $last_line = $end[0];
        $this->declarations[$declaration->getFunctionName()][] = $declaration;
      }
    }
    
    return $this->declarations;
  }

  /**
   * Searches the file for the format: (function(){})();
   */
  public function getExecutedFunctions(){
    if ($this->executions) {
      return $this->executions;
    }

    $lines = $this->getCode();
    
    $matches = preg_grep('%function%', $lines);
    $last_line = 0;
    foreach ($matches as $line_number => $line) {
      if ($line_number < $last_line) {
        continue;
      }

      if (preg_match('%(?:([a-zA-Z_.$][\w.$]*)\s*=\s*)?(?:new\s*)?\(\s*function\s*\([^)]*\)\s*{%', $line, $match)) {
        $execution = new DojoExecutedFunction($this);
        $execution->setAnonymous(true);
        if ($match[1]) {
          $execution->setFunctionName($match[1]);
        }
        $execution->setStart($line_number, strpos($line, $match[0]));
        $end = $execution->build();
        if ($end) {
          $last_line = $end[0];
          $callee = $lines[$end[0]];
          $this->executions[] = $execution;
        }
      }
    }
    
    return $this->executions;
  }
  
  /**
   * Use this to find everywhere in the code a function is called.
   *
   * @param unknown_type $name
   */
  public function getFunctionCalls($name){
    if ($this->calls[$name]) {
      return $this->calls[$name];
    }

    $this->calls[$name] = array();
    $lines = $this->getCode();
    $lines = preg_grep('%\b' . preg_quote($name) . '\s*\(%', $lines);
    foreach ($lines as $line_number => $line) {
      $position = strpos($line, $name);
      if ($line_number < $last_line_number || ($line_number == $last_line_number && $position < $last_position)) {
        continue;
      }
      $call = new DojoFunctionCall($this, $line_number, $position);
      list($last_line_number, $last_position) = $call->build();
      $this->calls[$name][] = $call;
    }
    return $this->calls[$name];
  }
  
  public function removeCodeFrom($lines){
    $keys = array_keys($lines);
    $first = array_shift($keys);
    $last = array_pop($keys);
    for($i = $first; $i <= $last; $i++) {
      $line = $lines[$i];
      if (preg_match('%function\s*\([^)]*\)\s*{%', $line, $match, PREG_OFFSET_CAPTURE)) {
        $declaration = new DojoFunctionDeclare($this, $i, $match[0][1]);
        list($i, ) = $declaration->build();
        $lines = $declaration->removeCodeFrom($lines);
      }
      elseif (preg_match('%^.*(with|switch)\s*\([^(]*\)\s*{%', $line, $match)) {
        $with_lines = Text::chop($lines, $i, strlen($match[0]) - 1, null, null, true);
        list($end_line, $end_pos) = Text::findTermination($with_lines, '}', '{}()[]');
        for ($j = $i; $j <= $end_line; $j++) {
          $line = $lines[$j];
          if ($j == $i) {
            $lines[$j] = Text::blankOutAt($line, strlen($match[0]) - 1);
          }
          elseif ($j == $end_line) {
            $lines[$j] = Text::blankOutAt($line, 0, $end_pos);
          }
          else {
            $lines[$j] = Text::blankOut($line, $line);
          }
        }
      }
    }
    
    return $lines;
  }
  
  public function getAliases(){
    if($this->aliases){
      return $this->aliases;
    }

    return $this->aliases;
  }

  public function getObjects(){
    if ($this->objects) {
      return $this->objects;
    }
    
    $lines = $this->getCode();
    foreach ($lines as $line_number => $line) {
      if ($line_number < $end_line_number) {
        continue;
      }
      if (preg_match('%\b([a-zA-Z0-9_.$]+)\s*=\s*{%', $line, $match, PREG_OFFSET_CAPTURE)) {
        $object = new DojoObject($this, $line_number, $match[0][1] + strlen($match[0][0]) - 1);
        $object->setName($match[1][0]);
        list($end_line_number, $end_position) = $object->build();
        $this->objects[] = $object;
      }
    }
    return $this->objects;
  }
  
  public function getSource(){
    if ($this->source) {
      return $this->source;
    }
    $lines = preg_split("%\r?\n%", file_get_contents($this->dojo->getDir() . $this->file));
    $lines[] = '';
    $in_comment = false;
    foreach ($lines as $line_number => $line) {
      $pos = 0;
      $found = true;
      while ($found) {
        $found = false;
        if (!$in_comment) {
          if (preg_match('%/\*={5,}%', $line, $match, PREG_OFFSET_CAPTURE, $pos)) {
            $line = $lines[$line_number] = Text::blankOut($match[0][0], $line);
            $found = true;
            $in_comment = true;
            $pos = $match[0][1] + strlen($match[0][0]);
          }
        }
        elseif (preg_match('%={5,}\*/%', $line, $match, PREG_OFFSET_CAPTURE, $pos)) {
          $line = $lines[$line_number] = Text::blankOut($match[0][0], $line);
          $found = true;
          $in_comment = false;
          $pos = $match[0][1] + strlen($match[0][0]);
        }
      }
    }
    return $this->source = $lines;
  }
  
  /**
   * Removes comments and strings, preserving layout
   */
  public function getCode(){
    if ($this->code) {
      return $this->code;
    }
    
    $lines = $this->getSource();
    
    $in_comment = false;
    foreach ($lines as $line_number => $line) {
      //print "$line_number $line\n";
      if ($in_comment !== false) {
        if (preg_match('%^.*\*/%U', $line, $match)) {
          $line = Text::blankOut($match[0], $line);
          $in_comment = false;
        }
        else {
          $line = Text::blankOut($line, $line);
        }
      }
      
      $position = 0;
      $in_single_string = false;
      $in_double_string = false;
      $in_regex = false;

      for ($i = 0; $i < 100; $i++) {
        $matches = array();

        if ($in_comment === false && $in_regex === false && $in_single_string === false && $in_double_string === false) {
          // Match the start of a line, the word return or case, or a character in: =([{,|&;:?
          // Followed by zero or more spaces
          // Followed by a forward slash
          // Not followed by another forward slash
          if (preg_match('%(?:^|\breturn\b|[=([{,|&;:?])\s*/(?!/)%', $line, $match, PREG_OFFSET_CAPTURE, $position)) {
            $matches[$match[0][1] + strlen($match[0][0]) - 1] = '/';
          }
          if (preg_match('%(?:^|\b(?:case|return)\b|[=([{,|&;:?+])\s*(["\'])%', $line, $match, PREG_OFFSET_CAPTURE, $position)) {
            $matches[$match[0][1] + strlen($match[0][0]) - 1] = $match[1][0];
          }
          if (($pos = strpos($line, '//', $position)) !== false) {
            $matches[$pos] = '//';
          }
          if (($pos = strpos($line, '/*', $position)) !== false) {
            $matches[$pos] = '/*';
          }
        }
        elseif ($in_regex !== false) {
          // A / not preceeded by a / or \
          // Followed by 0 or more spaces
          // Followed by one of the characters: img.)]},|&;: or end of line
          if (preg_match('%(?<![/\\\\])/\s*([img.)\]},|&;:]|$)%', $line, $match, PREG_OFFSET_CAPTURE, $position)) {
            //print_r($match);
            $matches[$match[0][1]] = '/';
          }
        }
        elseif ($in_single_string !== false || $in_double_string !== false) {
          for ($j = 0; $j < 999; $j++) {
            $q_pos = strpos($line, ($in_single_string) ? "'" : '"', $position);

            $bs_pos = strpos($line, '\\\\', $position);
            $m_pos = strpos($line, '\\' . ($in_single_string) ? "'" : '"', $position);

            if ($bs_pos !== false && $bs_pos < $q_pos) {
              $position = $bs_pos + 2;
            }
            if ($m_pos !== false && $m_pos < $q_pos) {
              $position = max($position, $m_post + 2);
            }

            if ($bs_pos === false && $m_pos === false) {
              break;
            }
          }
          $test = substr($line, $position);
          if (preg_match('%(' . ($in_single_string ? "'" : '"') . ')\s*([+.)\]},|&;:?]|==|$)%', $line, $match, PREG_OFFSET_CAPTURE, $position)) {
            $matches[$match[0][1]] = $match[1][0];
          }
        }
        elseif ($in_comment !== false) {
          if (($pos = strpos($line, '*/', $position)) !== false) {
            $matches[$pos] = '*/';
          }
        }
        
        if (!$matches) {
          break;
        }
        
        ksort($matches);
        foreach ($matches as $position => $match) {
          if ($in_comment === false && $in_regex === false && $in_single_string === false && $in_double_string === false) {
            if ($match == '"') {
              $in_double_string = $position;
              break;
            }
            elseif ($match == "'") {
              $in_single_string = $position;
              break;
            }
            elseif ($match == '/') {
              $in_regex = $position;
              break;
            }
            elseif ($match == '//') {
              $line = Text::blankOutAt($line, $position);
              break;
            }
            elseif ($match == '/*') {
              $in_comment = $position;
              ++$position;
              break;
            }
          }
          elseif ($in_double_string !== false && $match == '"') {
            $line = Text::blankOutAt($line, $in_double_string + 1, $position - 1);
            $in_double_string = false;
          }
          elseif ($in_single_string !== false && $match == "'") {
            $line = Text::blankOutAt($line, $in_single_string + 1, $position - 1);
            $in_single_string = false;
          }
          elseif ($in_regex !== false && $match == '/') {
            $line = Text::blankOutAt($line, $in_regex + 1, $position - 1);
            $in_regex = false;
          }
          elseif ($in_comment !== false && $match == '*/') {
            $line = Text::blankOutAt($line, $in_comment + 2, $position - 1);
            $in_comment = false;
          }
        }
        ++$position;
      }
      
      if($i == 500){
        die("\$i should not reach 500: $line");
      }
      
      if ($in_comment !== false && !empty($line)) {
        $line = Text::blankOutAt($line, $in_comment);
        $in_comment = 0;
      }
      
      //print "$line_number $line\n";
      $lines[$line_number] = $line;
    }

    return $this->code = $lines;
  }

  /** 
   * After all calls are done, return what's left
   */
  public function getExternalVariables(){
    $lines = $this->getCode();

    foreach ($this->objects as $pobject) {
      foreach ($pobject->declarations as $declaration) {
        $lines = Text::blankOutAtPositions($lines, $declaration->start[0], $declaration->start[1], $declaration->end[0], $declaration->end[1]);
      }
    }
    foreach($this->declarations as $declarations){
      foreach ($declarations as $declaration) {
        $lines = Text::blankOutAtPositions($lines, $declaration->start[0], $declaration->start[1], $declaration->end[0], $declaration->end[1]);
      }
    }
    foreach($this->calls as $call_name => $calls){
      foreach($calls as $call){
        $lines = Text::blankOutAtPositions($lines, $call->start[0], $call->start[1], $call->end[0], $call->end[1]);
      }
    }
    foreach($this->executions as $execution){
      $lines = Text::blankOutAtPositions($lines, $execution->start[0], $execution->start[1], $execution->end[0], $execution->end[1]);
    }

    $variables = array();
    foreach (preg_grep('%=%', $lines) as $line_number => $line) {
      if (preg_match('%\b([a-zA-Z_.$][\w.$]*)\s*=(?!=)\s*(function\s*\()?%', $line, $match)) {
        $variables[] = $match[1];
      }
    }

    return $variables;
  }
  
  /**
   * Remove items from the passed objects if they are inside of existing calls or declarations
   */
  public function removeSwallowed(&$objects){
    $swallowed = array();
    foreach ($objects as $i => $object) {
      foreach ($this->objects as $pobject) {
        if (($object->start[0] > $pobject->start[0] || ($object->start[0] == $pobject->start[0] && $object->start[1] > $pobject->start[1]))
            && ($object->end[0] < $pobject->end[0] || ($object->end[0] == $pobject->end[0] && $object->end[1] < $pobject->end[1]))) {
          if ($objects[$i]) {
            $swallowed[] = $objects[$i];
          }
          unset($objects[$i]);
        }        
        foreach ($pobject->declarations as $declaration) {
          if (($object->start[0] > $declaration->start[0] || ($object->start[0] == $declaration->start[0] && $object->start[1] > $declaration->start[1]))
              && ($object->end[0] < $declaration->end[0] || ($object->end[0] == $declaration->end[0] && $object->end[1] < $declaration->end[1]))) {
            if ($objects[$i]) {
              $swallowed[] = $objects[$i];
            }
            unset($objects[$i]);
          }
        }
      }
      foreach($this->declarations as $declarations){
        foreach ($declarations as $declaration) {
          if(($object->start[0] > $declaration->start[0] || ($object->start[0] == $declaration->start[0] && $object->start[1] > $declaration->start[1]))
              && ($object->end[0] < $declaration->end[0] || ($object->end[0] == $declaration->end[0] && $object->end[1] < $declaration->end[1]))) {
            if ($objects[$i]) {
              $swallowed[] = $objects[$i];
            }
            unset($objects[$i]);
          }
        }
      }
      foreach($this->calls as $call_name => $calls){
        foreach($calls as $call){
          if(($object->start[0] > $call->start[0] || ($object->start[0] == $call->start[0] && $object->start[1] > $call->start[1]))
              && ($object->end[0] < $call->end[0] || ($object->end[0] == $call->end[0] && $object->end[1] < $call->end[1]))) {
            if ($objects[$i]) {
              $swallowed[] = $objects[$i];
            }
            unset($objects[$i]);
          }
        }
      }
      foreach($this->executions as $execution){
        if(($object->start[0] > $execution->start[0] || ($object->start[0] == $execution->start[0] && $object->start[1] > $execution->start[1]))
              && ($object->end[0] < $execution->end[0] || ($object->end[0] == $execution->end[0] && $object->end[1] < $execution->end[1]))) {
            if ($objects[$i]) {
              $swallowed[] = $objects[$i];
            }
            unset($objects[$i]);
        }
      }
    }

    return $swallowed;
  }

  public function getPackageName(){
    $name = '';

    if (!function_exists($this->dojo->namespace . '_package_name')) {
      if (file_exists('modules/' . $this->dojo->namespace . '.module')){
        include_once('modules/' . $this->dojo->namespace . '.module');
      }
      else {
        $parts = explode('/', $this->file);
        $file_parts = explode('.', array_pop($parts));
        if (in_array('tests', $parts)) return;
        array_pop($file_parts);
        array_push($parts, implode('.', $file_parts));
        array_unshift($parts, $this->dojo->namespace);
        $name = implode('.', $parts);
      }
    }

    if (function_exists($this->dojo->namespace . '_package_name')) {
      $name = call_user_func($this->dojo->namespace . '_package_name', $this->dojo->namespace, $this->file);
    }

    if($name) return $name;
    return 'null';
  }

  public function getResourceName(){
    $name = '';

    if (!function_exists($this->dojo->namespace . '_resource_name')) {
      if (file_exists('modules/' . $this->dojo->namespace . '.module')) {
        include_once('modules/' . $this->dojo->namespace . '.module');
      }
      else {
        $name = $this->file;
      }
    }

    if (function_exists($this->dojo->namespace . '_resource_name')) {
      $name = call_user_func($this->dojo->namespace . '_resource_name', $this->dojo->namespace, $this->file);
    }

    if($name) return $name;
    return 'null';
  }

}

?>
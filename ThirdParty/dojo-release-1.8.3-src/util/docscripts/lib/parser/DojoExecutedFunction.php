<?php

require_once('DojoFunctionDeclare.php');
require_once('DojoParameters.php');
require_once('Text.php');

class DojoExecutedFunction extends DojoFunctionDeclare
{
  private $object = 'DojoExecutedFunction';

  public function build(){
    if(!$this->start){
      die("DojoExecutedFunction->build() used before setting a start position");
    }
    if($this->end){
      return $this->end;
    }

    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1]);
    $line = $lines[$this->start[0]];
    
    $this->start = array($this->start[0], strpos($line, 'function'));

    $this->end = parent::build(); // Basically, the end array here will hold the position of the final } in the function declaration.

    $parameters = $this->getParameters();
    if (count($parameters) && ($pos = strpos($lines[$this->end[0]], '(')) !== false) {
      $arguments = new DojoParameters($this->package);
      $arguments->start = array($this->end[0], $pos);
      $arguments->build();
      $arguments = $arguments->getParameters();
      foreach ($parameters as $pos => $parameter) {
        if ($arguments[$pos]) {
          $argument = $arguments[$pos];
          if ($argument->isA(DojoVariable) && $parameter->isA(DojoVariable)) {
            if (preg_match('%(^|\|\|)([a-zA-Z0-9_.$]+)(\|\||$)%', $argument->getVariable(), $match)) {
              $this->body->addResolvedParameter($parameter->getVariable(), $match[2]);
            }
          }
        }
      }
    }
    $lines = Text::chop($this->package->getCode(), $this->end[0], $this->end[1], false, false, true);
    $closed = false;
    foreach($lines as $line_number => $line){
      $offset = 0;
      if($line_number == $this->end[0]){
        $offset = $this->end[1];
      }
      if(preg_match('%\S%', $line, $match, PREG_OFFSET_CAPTURE, $offset)){
        if(!$closed){
          if($match[0][0] != ')'){
            return false;
          }else{
            $closed = true;
            $offset = $match[0][1] + 1;
          }
        }
      }
      if(preg_match('%\S%', $line, $match, PREG_OFFSET_CAPTURE, $offset)){
        if($closed){
          if($match[0][0] != '('){
            return false;
          }else{
            $parameters = new DojoParameters($this->package, $line_number, $match[0][1]);
            $end = $parameters->build();
            break;
          }
        }
      }
    }
    return $end;
  }

  public function rollOut(&$output) {
    if ($this->getFunctionName()) {
      parent::rollOut($output);
    }

    $execution_variables = $this->getVariableNames($this->getFunctionName());
    foreach ($execution_variables as $execution_variable) {
      if (empty($output[$execution_variable])) {
        $output[$execution_variable] = array();
      }
    }

    $execution_declarations = $this->getFunctionDeclarations();
    foreach ($execution_declarations as $declaration) {
      $declaration->rollOut($output);
    }

    $execution_objects = $this->getObjects();
    foreach ($execution_objects as $object) {
      $object->rollOut($output);
    }
    unset($object);
    unset($execution_objects);

    if ($this->getFunctionName()) {
      $instance_declarations = $this->getInstanceFunctions($this->getFunctionName());
      foreach ($instance_declarations as $declaration) {
        $declaration->rollOut($output);
      }
    }
  }
}

?>
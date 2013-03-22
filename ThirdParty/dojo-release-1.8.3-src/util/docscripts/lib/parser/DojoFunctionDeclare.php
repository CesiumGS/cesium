<?php

require_once('DojoFunctionBody.php');
require_once('DojoBlock.php');
require_once('DojoParameters.php');

class DojoFunctionDeclare extends DojoBlock
{
  private $object = 'DojoFunctionDeclare';

  private $parameters;
  private $function_name;
  protected $body;

  private $in_executed_function = null;
  private $anonymous = false;
  private $prototype = '';
  private $constructor = false;
  private $aliases = '';

  public function __construct($package, $line_number = false, $position = false){
    parent::__construct($package, $line_number, $position);
    $this->parameters = new DojoParameters($package);
    $this->body = new DojoFunctionBody($package);
  }

  public static function parseVariable(&$comment) {
    $summary = $comment;
    $tags = array();
    if (preg_match('%^\s*([a-z\s]+)\]\s*%', $summary, $match)) {
      $tags = preg_split('%\s+%', $match[1]);
      $summary = $comment = substr($summary, strlen($match[0]));
    }

    list($type, $summary) = preg_split('%\s%', $summary, 2);
    $type = preg_replace('%(^[^a-zA-Z0-9._$]|[^a-zA-Z0-9._$?]$)%', '', $type);

    $options = array();
    if(!empty($type)){
      if(strpos($type, '?')){
        $type = substr($type, 0, strlen($type) - 1);
        $options['optional'] = true;
      }
      if(strpos($type, '...')){
        $type = substr($type, 0, strlen($type) - 3);
        $options['repeating'] = true;
      }
    }

    return array($tags, $type, $options, $summary);
  }

  public function destroy() {
    if (!$this->destroyed) {
      $this->destroyed = true;
      $this->parameters->destroy();
      unset($this->parameters);
      $this->body->destroy();
      unset($this->body);
      if ($this->in_executed_function) {
        $this->in_executed_function->destroy();
      }
      unset($this->in_executed_function);
    }
  }

  public function getFunctionName(){
    return $this->function_name;
  }

  public function getAliases(){
    return $this->aliases;
  }

  public function rebuildAliases($map) {
    if (is_array($this->aliases)) {
      foreach ($this->aliases as $i => $alias) {
        foreach ($map as $internal_name => $external_name) {
          if (strpos($alias, $internal_name . '.') === 0) {
            if (!$external_name) continue 2;
            $alias = $external_name . substr($alias, strlen($internal_name));
          }
        }
        $this->aliases[$i] = $alias;
      }
    }
  }

  public function setFunctionName($function_name){
    $this->function_name = $function_name;
  }

  public function setPrototype($function_name){
    $this->prototype = $function_name;
  }
  
  public function getPrototype(){
    return $this->prototype;
  }
  
  public function setInstance($function_name){
    $this->instance = $function_name;
  }
  
  public function getInstance(){
    return $this->instance;
  }
  
  public function setConstructor($constructor){
    $this->constructor = $constructor;
  }
  
  public function isConstructor(){
    return $this->constructor;
  }

  public function setAnonymous($anonymous) {
    $this->anonymous = $anonymous;
  }

  public function isAnonymous(){
    return $this->anonymous;
  }
  
  public function isThis(){
    return ($this->prototype || $this->instance);
  }
  
  public function getThis(){
    return ($this->prototype) ? $this->prototype : $this->instance;
  }

  public function setExecutedFunction($function) {
    $this->in_executed_function = $function;
  }
  
  public function getInstanceVariableNames(){
    return array_unique($this->body->getInstanceVariableNames());
  }

  public function removeSwallowedMixins(&$mixins) {
    return $this->body->removeSwallowedMixins($mixins);
  }
  
  public function getReturnComments(){
    return array_unique($this->body->getReturnComments());
  }
  
  public function getThisInheritanceCalls(){
    $output = array();
    $calls = array_unique($this->body->getThisInheritanceCalls());

    if ($this->in_executed_function) {
      $internalized = $this->in_executed_function->getLocalVariableNames();
    }

    $parameters = $this->getParameterNames();
    foreach ($calls as $call) {
      if (!in_array($call, $parameters)) {
        if ($internalized) {
          foreach (array_keys($internalized) as $variable) {
            if (strpos($call, $variable . '.') === 0) {
              continue 2;
            }
          }
        }
        $output[] = $call;
      }
    }

    return $output;
  }

  public function getVariableNames($function_name, $parameter_names=array()){
    return $this->body->getExternalizedVariableNames($function_name, $parameter_names);
  }

  public function getFunctionDeclarations(){
    return $this->body->getExternalizedFunctionDeclarations();
  }

  public function getObjects(){
    return $this->body->getExternalizedObjects(false, $this->getParameterNames());
  }

  public function getLocalVariableNames(){
    return $this->body->getLocalVariableNames();
  }
  
  public function removeCodeFrom($lines){
    $this->build();

    return Text::blankOutAtPositions($lines, $this->start[0], $this->start[1], $this->end[0], $this->end[1]);
  }
  
  public function build(){
    if (!$this->start) {
      die("DojoFunctionDeclare->build() used before setting a start position");
    }
    if($this->end){
      return $this->end;
    }
  
    $lines = Text::chop($this->package->getCode(), $this->start[0], $this->start[1]);
    $line = trim($lines[$this->start[0]]);
    if(strpos($line, 'function') === 0){
      $line = substr($line, 8);
      preg_match('%[^\s]%', $line, $match);
      if($match[0] != '('){
          $this->function_name = trim(substr($line, 0, strpos($line, '(')));
      }
    }else{
      $name = trim(substr($line, 0, strpos($line, '=')));
      $extra = substr($line, strpos($line, '=') + 1);
      if(preg_match('%^\s+new\s+%', $name, $match) || preg_match('%^\s*new\s+%', $extra, $match)){
        $this->anonymous = true;
        $name = str_replace($match[0], '', $name);
      }
      if(($pos = strpos($name, '.prototype.')) !== false){
        $this->prototype = substr($name, 0, $pos);
        $name = str_replace('.prototype', '', $name);
      }
      if(($pos = strpos($name, 'this.')) === 0){
        $this->instance = $this->getFunctionName();
        $name = $this->getFunctionName() . "." . preg_replace('%^this\.%', '', $name);
      }

      if (!$this->isAnonymous()) {
        $full_lines = Text::chop($this->package->getCode(), $this->start[0], 0);
        $full_line = substr($full_lines[$this->start[0]], 0, $this->start[1]);
        if (preg_match('%(?:[a-zA-Z0-9._$]+\s*=\s*)+$%', $full_line, $matches)) {
          $aliases = preg_split('%\s*=\s*%', $matches[0]);
          foreach ($aliases as $alias) {
            $alias = trim($alias);
            if ($alias) {
              if (strpos($alias, 'this.') === 0) {
                $alias = $this->getFunctionName() . "." . preg_replace('%^this\.%', '', $alias);
              }
              $this->aliases[] = $alias;
            }
          }
        }
      }

      if (strpos($name, '[') !== false) {
        $source_lines = Text::chop($this->package->getSource(), $this->start[0], $this->start[1]);
        $source_line = trim($source_lines[$this->start[0]]);
        preg_match('%^\s*([a-zA-Z_.$][\w.$]*(?:\.[a-zA-Z_.$][\w.$]|\["[^"]+"\])*)\s*=\s*function%', $source_line, $match);
        $name = preg_replace('%\["([^"]+)"\]%', '.$1', $match[1]);
      }
      $this->function_name = $name;
    }
    
    $this->parameters->setStart($this->start[0], strpos($lines[$this->start[0]], '('));
    $end = $this->parameters->build();
    
    $lines = Text::chop($this->package->getCode(), $end[0], $end[1]);
    foreach($lines as $line_number => $line){
      if(($pos = strpos($line, '{')) !== false){
        $this->body->setStart($line_number, $pos);
        return $this->end = $this->body->build();
      }
    }
  }
  
  public function getParameter($pos){
    return $this->parameters->getParameter($pos);
  }
  
  public function getParameters(){
    return $this->parameters->getParameters();
  }

  public function getParameterNames(){
    $names = array();
    $parameters = $this->getParameters();
    foreach ($parameters as $parameter) {
      if($parameter->isA(DojoVariable)){
        $names[] = $parameter->getVariable();
      }
    }
    return $names;
  }
  
  public function addBlockCommentKey($key){
    $this->body->addBlockCommentKey($key);
  }

  public function addBlockCommentKeySet($key){
    $this->body->addBlockCommentKeySet($key);
  }

  public function getBlockCommentKeys(){
    return $this->body->getBlockCommentKeys();
  }
  
  public function getBlockComment($key){
    return $this->body->getBlockComment($key);
  }
  
  public function getSource(){
    return $this->body->getSource();
  }
  
  public function getInstanceFunctions($function_name){
    return $this->body->getInstanceFunctions($function_name);
  }
  
  public function rollOut(&$output){
    // Basically, any this.variables in here never impact this object, they apply to the "this" function
    $masquerading_as_function = $function_name = $this->getFunctionName();
    if (substr($masquerading_as_function, 0, 7) == 'window.'){
      $masquerading_as_function = $function_name = substr($masquerading_as_function, 7);
    }
    $check_keys = array('summary','description','returns','tags','exceptions');

    if (!empty($output[$function_name]['aliases'])) {
      unset($output[$function_name]['aliases']); // This is implemented, it aliases nothing.
    }

    if ($this->isThis()) {
      $masquerading_as_function = $this->getThis();
    }

    $output[$function_name]['type'] = 'Function';
    if (!empty($output[$masquerading_as_function])) {
      $output[$masquerading_as_function]['type'] = 'Function';
    }

    if ($aliases = $this->getAliases()) {
      foreach ($aliases as $alias) {
        if (empty($output[$alias])) {
          $output[$alias]['aliases'] = $function_name;
        }
      }
    }

    $parameters = $this->getParameters();
    foreach ($parameters as $parameter) {
      if($parameter->isA(DojoVariable)){
        $parameter_name = $parameter->getVariable();
        $parameter_type = $parameter->getType();
        if(strpos($parameter_type, '?')){
          $parameter_type = substr($parameter_type, 0, strlen($parameter_type) - 1);
          $output[$function_name]['parameters'][$parameter_name]['optional'] = true;
        }
        if(strpos($parameter_type, '...')){
          $parameter_type = substr($parameter_type, 0, strlen($parameter_type) - 3);
          $output[$function_name]['parameters'][$parameter_name]['repeating'] = true;
        }
        if (empty($output[$function_name]['parameters'][$parameter_name]['type']) || $parameter_type) {
          $output[$function_name]['parameters'][$parameter_name]['type'] = $parameter_type;
        }

        $this->addBlockCommentKey($parameter->getVariable());
      }
    }

    if ($this->isAnonymous()) {
      $output[$function_name]['initialized'] = true;

      $declarations = $this->body->getExternalizedFunctionDeclarations($function_name);
      foreach ($declarations as $declaration) {
        $declaration->rollout($output);
      }

      $variables = $this->body->getExternalizedInstanceVariableNames($function_name, $this->getParameterNames());
      foreach($variables as $variable) {
        $output[$function_name . '.' . $variable]['instance'] = $function_name;
      }

      $variables = $this->body->getExternalizedVariableNames($function_name, $this->getParameterNames());
      foreach($variables as $variable) {
        list($first,) = explode('.', $variable, 2);
        if (!is_array($output[$function_name]['parameters']) || !array_key_exists($first, $output[$function_name]['parameters'])) {
          if (empty($output[$variable])) {
            $output[$variable] = array();
          }
        }
      }
    }

    foreach($check_keys as $ck){
      $this->addBlockCommentKey($ck);
    }
    $this->addBlockCommentKeySet('example');
    $check_keys[] = 'example';

    $output[$function_name]['source'] = $this->getSource();

    $all_variables = array();
    $instance_variables = $this->getInstanceVariableNames();
    foreach($instance_variables as $instance_variable){
      $this->addBlockCommentKey($instance_variable);
      $all_variables[] = $instance_variable;

      $full_variable_name = "{$masquerading_as_function}.{$instance_variable}";
      $output[$full_variable_name]['instance'] = $masquerading_as_function;
    }

    $instance_functions = $this->getInstanceFunctions($function_name);
    foreach($instance_functions as $instance_function){
      $instance_function->rollOut($output);
      $output[$instance_function->getFunctionName()]['instance'] = $function_name;
    }

    $comment_keys = $this->getBlockCommentKeys();
    foreach($comment_keys as $key){
      if ($key == 'returns') {
        $output[$function_name]['return_summary'] = $this->getBlockComment($key);
      }
      elseif (in_array($key, $check_keys)) {
        $output[$function_name][$key] = $this->getBlockComment($key);
      }
      if (in_array($key, $all_variables) && $comment = $this->getBlockComment($key)) {
         list($type, $comment) = preg_split('%\s+%', $comment, 2);
        $type = preg_replace('%(^[^a-zA-Z0-9._$]|[^a-zA-Z0-9._$?]$)%', '', $type);
        if($type){
          $output[$function_name . '.' . $key]['type'] = $type;
        }
        $output[$function_name . '.' . $key]['summary'] = $comment;
      }
      if (!empty($output[$function_name]['parameters']) && array_key_exists($key, $output[$function_name]['parameters']) && $comment = $this->getBlockComment($key)) {
        list($tags, $parameter_type, $options, $summary) = DojoFunctionDeclare::parseVariable($comment);

        // If type is specified in the parameters, and it doesn't
        // match the first word in this comment block, assume that
        // this first word doesn't represent its type
        if (!empty($output[$function_name]['parameters'][$key]['type']) && $parameter_type != $output[$function_name]['parameters'][$key]['type']) {
          $summary = $comment;
          $parameter_type = $output[$function_name]['parameters'][$key]['type'];
        }
        $output[$function_name]['parameters'][$key] = array_merge($output[$function_name]['parameters'][$key], $options); 
        $output[$function_name]['parameters'][$key]['type'] = $parameter_type;
        $output[$function_name]['parameters'][$key]['summary'] = htmlentities($summary);
      }
    }

    $returns = $this->getReturnComments();
    if (count($returns)){
      $output[$function_name]['returns'] = implode('|', $returns);
    }

    if ($output[$function_name]['example']) {
      $output[$function_name]['examples'] = $output[$function_name]['example'];
      unset($output[$function_name]['example']);
    }

    if($calls = $this->getThisInheritanceCalls()){
      foreach ($calls as $call) {
        $output[$function_name]['chains']['call'][] = $call;
      }
    }
    
    if($this->getPrototype()){
      $output[$function_name]['prototype'] = $this->getPrototype();
    }
    if($this->getInstance()){
      $output[$function_name]['instance'] = $this->getInstance();
    }
  }
}

?>

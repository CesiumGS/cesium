<?php

require_once('DojoParameter.php');
require_once('DojoBlock.php');

class DojoParameters extends DojoBlock
{
  private $object = 'DojoParameters';

  private $parameters = array();
  protected $terminator = ')';

  public function __construct($package, $line_number = false, $position = false){
    parent::__construct($package, $line_number, $position);
  }

  public function destroy() {
    array_walk($this->parameters, 'destroy_all');
    unset($this->parameters);
  }

  public function build(){
    if (!$this->start) {
      die("DojoParameters->build() used before setting a start position");
    }

    $code = $this->package->getCode();
    $end = array($this->start[0], $this->start[1]);

    do {
      $parameter = new DojoParameter($this->package, $end[0], $end[1], $this->terminator);
      $end = $parameter->build();

      $this->parameters[] = $parameter;
    } while ($code[$end[0]]{$end[1]} != $this->terminator);

    $this->setEnd($end[0], $end[1]);
    return $end;
  }

  public function getParameter($pos){
    if ($this->parameters && !empty($this->parameters[$pos])) {
      return $this->parameters[$pos];
    }
    else {
      return new DojoParameter($this->package);
    }
  }

  public function getParameters(){
    if ($this->parameters) {
      return $this->parameters;
    }
    else{
      return array();
    }
  }
}

?>
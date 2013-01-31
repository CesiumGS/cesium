<?php

class DojoNull
{
	private $object = 'DojoNull';
  
	private $value = '';
  
	public function __construct($value){
    		$this->value = $value;
  	}
  
	public function getValue(){
    		return $this->value;
 	}
}

?>
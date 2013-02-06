<?php

class DojoString
{
	private $object = 'DojoString';
  
	private $value = '';
  
	public function __construct($string){
    		$this->value = preg_replace('%(^[\'"]|["\']$)%', '', $string);
  	}
  
  	public function getValue(){
    		return $this->value;
  	}
}

?>
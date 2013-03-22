<?php

class DojoBoolean
{
	private $value = '';
	
	public function __construct($value){
		$this->value = ($value == 'true');
	}
	
	public function getValue(){
		return $this->value;
	}
}

?>
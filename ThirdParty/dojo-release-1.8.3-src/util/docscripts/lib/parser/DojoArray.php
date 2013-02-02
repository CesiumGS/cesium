<?php

require_once('DojoParameters.php');
require_once('DojoBlock.php');

class DojoArray extends DojoParameters
{
	private $object = 'DojoArray';
	protected $terminator = ']';

	public function getItems(){
		return $this->getParameters();
	}
	
	public function getItem($pos){
		return $this->getParameter($pos);
	}
}

?>
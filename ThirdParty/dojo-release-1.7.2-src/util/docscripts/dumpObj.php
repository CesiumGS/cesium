<?php

ini_set("ERROR_REPORTING", 0);
include_once('lib/parser2/dojo2.inc');
$allfiles = @dojo_get_files();

if($argc || !empty($_GET['f'])){

	$argfile = empty($_GET['f']) ? $argv[1] : $_GET['f'];

	$parts = explode("/", $argfile);
	$ns = array_shift($parts);
	$file = implode("/", $parts);
	
	try{
		$data = @dojo_get_contents($ns, $file);
	}catch (Exception $e){
		$data = array(
			"success" => False,
			"error" => $e
		);
	}

	if(!empty($_GET['f'])){
		header("Content-type: application/json");
	}

	print json_encode($data);
}

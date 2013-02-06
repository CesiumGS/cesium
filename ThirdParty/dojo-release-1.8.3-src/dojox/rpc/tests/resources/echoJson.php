<?php
	if (!$_REQUEST["message"]){
		print "ERROR: message property not found";
	}else{
		header("Content-Type: application/json");
		print $_REQUEST["message"];
	}
?>

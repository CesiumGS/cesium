<?php
	// ensure that we don't try to send "html" down to the client
	header("Content-Type: application/json");

	$jsonp = false;
	$result = "";

	if ($_REQUEST["testCallbackParam"]){
		$jsonp=true;
		$result .= $_REQUEST['testCallbackParam'] . "('";
	}

	if (!$_REQUEST["message"]){
		$result .= "ERROR: message property not found";
	}

	$result .= $_REQUEST["message"];

	if ($jsonp) {
		$result .= "');";
	}

	print $result;


?>

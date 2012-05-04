<?php
	// ensure that we don't try to send "html" down to the client
	header("Content-Type: application/json");

        require_once("./JSON.php");
        $json = new Services_JSON;

	$id = $_REQUEST['id'];
	$method = $_REQUEST['method'];
	$params = $json->decode($_REQUEST['params']);
	$callback = $_REQUEST["callback"];

	switch($method){
		case "jsonpJsonRpc10EchoNamed":
		case "jsonpJsonRpc11Echo":
		case "jsonpJsonRpc11EchoNamed":
		case "jsonpJsonRpc10Echo":
			if ( ($method=="jsonpJsonRpc10EchoNamed")||($method=="jsonpJsonRpc11EchoNamed")){
				$message = $params->message;
			}else{
				$message = $params[0];
			}
			if ($message){
				switch($method){
					case "jsonpJsonRpc11Echo":
					case "jsonpJsonRpc11EchoNamed":
						$res = "{'id': '$id', result: '$message'}";
						break;
					default:
						$res = "{'id': '$id', result: '$message', 'error':''}";
						break;
				}
			}else{
				$res = "{'id': '$id', error: {'code': 100, 'message':'no message provided'}}";
			}
	}

	print "$callback($res)";

?>

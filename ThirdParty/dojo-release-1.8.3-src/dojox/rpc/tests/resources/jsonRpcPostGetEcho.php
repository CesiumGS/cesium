<?php
	// ensure that we don't try to send "html" down to the client
	header("Content-Type: application/json");

	require_once("./JSON.php");

	$json = new Services_JSON;
	$method = $_REQUEST["method"];
	$id = $_REQUEST["id"];
	$params = $_REQUEST["params"];
	$result = "";

	switch ($method){
		case "postJsonRpc10Echo":
		case "getJsonRpc10Echo":
		case "postJsonRpc10EchoNamed":
		case "getJsonRpc10EchoNamed":
			$p = $json->decode($params);
			$result = "{id:" . $id . ", 'result':'" . $p[0]. "', error:''}";
			break;
		case "postJsonRpc12Echo":
		case "getJsonRpc12Echo":
		case "postJsonRpc12EchoNamed":
		case "getJsonRpc12EchoNamed":
			$p = $json->decode($params);

			if ($p->message){
				$d = $p->message;
			}else{
				$d=$p[0];
			}
			$result = "{id:" . $id . ", 'result':'" . $d . "'}";
			break;
		default:
			$result = "{id:'1','error':'Unknown Method', 'result':'this result only here for this test, shouldnt be here in real code'}";
			break;
	}

	print $result;

?>

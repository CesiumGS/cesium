<?php
	require_once("./JSON.php");
	
	// FIXME: doesn't look like we really need Pear at all
	// which decreases the testing burden. 
	// Commenting out.the require and the new File() call.

	// NOTE: File.php is installed via Pear using:
	//	%> sudo pear install File
	// Your server will also need the Pear library directory included in PHP's
	// include_path configuration directive
	// require_once('File.php');

	// ensure that we don't try to send "html" down to the client
	header("Content-Type: text/plain");

	$json = new Services_JSON;
	//$fp = new File();

	$results = array();
	$results['error'] = null;

	$jsonRequest = file_get_contents('php://input');
	//$jsonRequest = '{"params":["Blah"],"method":"myecho","id":86}';

	$req = $json->decode($jsonRequest);

	include("./testClass.php");
	$testObject = new testClass();

	$method = $req->method;
	if ($method != "triggerRpcError") {
		$ret = call_user_func_array(array($testObject,$method),$req->params);
		$results['result'] = $ret;
	} else {
		$results['error'] = "Triggered RPC Error test";
	}
	$results['id'] = $req->id;

	$encoded = $json->encode($results);

	print $encoded;
?>

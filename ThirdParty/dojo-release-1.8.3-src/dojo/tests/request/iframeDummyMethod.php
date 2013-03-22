<?php
function fix_raw_data($data){
	$arr = array();
	$pairs = explode('&', $data);

	foreach ($pairs as $i) {
		if (!empty($i)) {
			list($name, $value) = explode('=', $i, 2);

			if (isset($arr[$name])) {
				if (is_array($arr[$name])) {
					$arr[$name][] = $value;
				} else {
					$arr[$name] = array($arr[$name], $value);
				}
			} else {
				$arr[$name] = $value;
			}
		}
	}

	return $arr;
}

function outputType($type, $q, $p){
	if($type == 'json'){
		$result = array(
			"method" => $_SERVER['REQUEST_METHOD'],
			"query" => $q,
			"post" => $p
		);
		echo json_encode($result);
	}else if($type == 'javascript'){
		echo "window.iframeTestingFunction = function(){ return 42; };";
	}else if(array_key_exists('text', $q)){
		echo $q['text'];
	}else{
		echo "iframe succeeded";
	}
}

$query = null;
if (!empty($_SERVER['QUERY_STRING'])) {
	$query = fix_raw_data($_SERVER['QUERY_STRING']);
}

$post = null;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$post = file_get_contents('php://input');
	if(empty($post)){
		$post = $_POST;
	}else{
		$post = fix_raw_data($post);
	}
}

if((!empty($query) && array_key_exists('delay', $query))){
	sleep((int)$query['delay']);
}else if((!empty($post) && array_key_exists('delay', $post))){
	sleep((int)$post['delay']);
}

header("HTTP/1.1 200 OK");
header("Expires: " . gmdate("D, d M Y H:i:s") . "GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");

if($query['type'] == 'xml'){
	header("Content-type: text/xml");
	echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<Envelope title="Test of dojo.io.iframe xml test">
	<Children>
		<child>FOO</child>
		<child>BAR</child>
		<child>BAZ</child>
		<child>BAT</child>
	</Children>
	<![CDATA[
		function(){
			for(var i=0; i<somethign; i++){
				if(foo>bar){ /* whatever */ }
			}
		}
	]]>
	<a href="something">something else</a>
</Envelope>
<?php
}else{
	header("Content-type: text/html");
?>
<html>
	<head></head>
	<body>
<?php
	if($query['type'] == 'html'){
?>
		<h1>SUCCESSFUL HTML response</h1>
<?php
	}else{
?>
		<textarea style="width: 100%; height: 100px;"><?php outputType($query['type'], $query, $post); ?></textarea>
	</body>
</html>
<?php
	}
}
?>

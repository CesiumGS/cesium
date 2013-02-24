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

//Just a dummy end point to use in HTTP method calls like PUT and DELETE.
//This avoids getting a 405 method not allowed calls for the tests that reference
//this file.

$query = null;
if (!empty($_SERVER['QUERY_STRING'])) {
	$query = fix_raw_data($_SERVER['QUERY_STRING']);
	if(!empty($query) && array_key_exists('delay', $query)){
		sleep((int)$query['delay']);
	}
}

$post = null;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	if(!strcmp($_SERVER['HTTP_CONTENT_TYPE'], 'application/x-www-form-urlencoded')){
		$post = fix_raw_data(file_get_contents('php://input'));
	}else{
		$post = $_POST;
	}
}

$put = null;
if ($_SERVER['REQUEST_METHOD'] == 'PUT') {
	$put = fix_raw_data(file_get_contents('php://input'));
}

$del = false;
if ($_SERVER['REQUEST_METHOD'] == 'DELETE') {
	$del = true;
}

$result = array(
	"method" => $_SERVER['REQUEST_METHOD'],
	"query" => $query,
	"post" => $post,
	"put" => $put,
	"del" => $del
);

header("HTTP/1.1 200 OK");
header("Expires: " . gmdate("D, d M Y H:i:s") . "GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");
header("Content-type: application/json");

echo json_encode($result);
?>

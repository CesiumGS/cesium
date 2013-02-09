<?php

$data = array(
	"method" => strtoupper($_SERVER["REQUEST_METHOD"]),
	"headers" => array(),
	"content" => null
);

foreach($_SERVER as $key => $value){
	if(strpos($key, "HTTP_") === 0){
		$data["headers"][strtr(strtolower(substr($key, 5)), "_", "-")] = $value;
	}
}

if($data["method"] === "GET"){
	$data["content"] = $_GET;
}elseif($data["method"] === "PUT" || $data["method"] === "POST"){
	$data["content"] = json_decode(file_get_contents("php://input"), true);
}

header("Content-Type: application/json");
header("Cache-Control: no-cache");
echo json_encode($data);
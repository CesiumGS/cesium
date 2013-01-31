<?php
if(array_key_exists("delay", $_GET)){
	sleep((int)$_GET["delay"]);
}

header("HTTP/1.1 200 OK");
header("Expires: " . gmdate("D, d M Y H:i:s") . "GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");
header("Content-type: application/x-javascript");

if(array_key_exists("callback", $_GET)){
	echo $_GET["callback"] . "({ animalType: 'mammal' });";
}else if(array_key_exists("checkString", $_GET)){
	echo "var " . $_GET["checkString"] . " = ['Take out trash.', 'Do dishes.', 'Brush teeth.'];";
}else if(array_key_exists("scriptVar", $_GET)){
	echo "var " . $_GET["scriptVar"] . " = 'loaded';";
}

?>

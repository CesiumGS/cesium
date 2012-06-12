<?php
if($_SERVER['REQUEST_METHOD'] == "PUT" || $_SERVER['REQUEST_METHOD'] == 'DELETE'){
	header($_SERVER["SERVER_PROTOCOL"]." 403 Forbidden", true, 403);
	print("Modification forbidden, resource doesn't exist");
}else if($_SERVER['REQUEST_METHOD'] == 'POST'){
	header($_SERVER["SERVER_PROTOCOL"]." 400 Bad Request", true, 400);
}
?>
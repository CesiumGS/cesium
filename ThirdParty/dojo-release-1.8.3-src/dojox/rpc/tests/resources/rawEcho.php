<?php
		// ensure that we don't try to send "html" down to the client
		header("Content-Type: application/json");

        print file_get_contents('php://input');

?>


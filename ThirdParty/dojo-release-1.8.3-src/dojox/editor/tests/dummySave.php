<?php
	header("Content-Type", "text/plain");
	print("Obtained RAW POST data: \n");
	print(htmlentities($HTTP_RAW_POST_DATA));
?>

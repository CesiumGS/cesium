<?php
if($_SERVER['REQUEST_METHOD'] == 'POST'){
	header('Location: http://example.com/samplefeed.xml/entry/10', true, 201);
}
?>

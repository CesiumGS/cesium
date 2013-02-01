<?php
$filename = $_POST['filename'];
$data = $_POST['data'];
$file = $filename;
$f = fopen($file, 'w');
fwrite($f, $data);
fclose($f);
?>

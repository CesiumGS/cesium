<?php
error_reporting(1);
$count = $_GET['count'] ? $_GET['count'] : 10;
$start = $_GET['start'] ? $_GET['start'] : 1;
echo "{items:[\n";
for ($i = $start; $i < $start + $count; $i++) {
	echo "{label:'Item #" . $i . "'}";
	if ($i < $start + $count - 1) {
		echo ",";
	}
	echo "\n";
}
echo "]}\n";
?>

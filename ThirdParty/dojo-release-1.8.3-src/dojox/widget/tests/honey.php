<?php
/* honey.php - sample fake delay script to push data
   - should use ob_flush() to send chunks rather than 
   just take a long time ...
*/

session_start(); 

$char = " "; 
$fakeDelay = (empty($_GET['delay'])) ? 1 : $_GET['delay'];
$dataSize = (empty($_GET['size'])) ? 2*1024 : $_GET['size'];
if (empty($_SESSION['counter'])) $_SESSION['counter'] = 1; 
$dataSent = 0;
$blockSize = 1024;

if ($fakeDelay) { sleep($fakeDelay); }

print "view num: ".$_SESSION['counter']++;
while ($dataSent<=$dataSize) {
	for ($i=0; $i<$blockSize/4; $i++) {
		print $char; 
	} print "<br />"; 
	$dataSent += $blockSize; 
	sleep(1);
}

?>

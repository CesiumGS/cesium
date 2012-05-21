<?php

$callbackName = htmlspecialchars($_REQUEST["callback"]);
sleep(5);
print "SuperXFooBarVariable = 'Oh no! SuperXFooBarVariable is defined (should not be for timeout case).'; {$callbackName}({Status: 'good'});";

?>

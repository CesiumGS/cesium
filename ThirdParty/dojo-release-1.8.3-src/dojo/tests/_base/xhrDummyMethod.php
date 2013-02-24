<?php
//Just a dummy end point to use in HTTP method calls like PUT and DELETE.
//This avoids getting a 405 method not allowed calls for the tests that reference
//this file.

header("HTTP/1.1 200 OK");
?>

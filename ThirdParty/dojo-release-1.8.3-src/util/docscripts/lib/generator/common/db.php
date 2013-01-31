<?php

function db_query() {
  global $db_host, $db_user, $db_password, $db_name;
  static $db;
  if (!$db) {
    $db = mysql_connect($db_host, $db_user, $db_password) or die;
    mysql_select_db($db_name, $db);
  }

  $args = func_get_args();
  $query = (count($args) > 1) ? call_user_func_array('sprintf', $args) : $args[0];
  return mysql_query($query, $db);
}

function db_fetch_assoc($query) {
  return mysql_fetch_assoc($query);
}
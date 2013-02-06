<?php

require_once('lib/generator/common/db.php');

final class Freezer
{
  private $namespace = '';

  public static function clean($directory, $namespace) {
    db_query("TRUNCATE freezer");
  }

  function __construct($directory, $namespace) {
    $this->namespace = $namespace;
  }

  public function ids($flush = TRUE) {
    $ids = array();

    $query = db_query("SELECT id FROM freezer WHERE namespace = '%s'", $this->namespace);
    while ($row = db_fetch_assoc($query)) {
      $ids[] = $row['id'];
    }

    return $ids;
  }

  public function open($key, $default) {
    $query = db_query("SELECT value FROM freezer WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $this->namespace, $key, $key);
    if ($row = db_fetch_assoc($query)) {
      return unserialize($row['value']);
    }
    return $default;
  }

  public function save($key, $content) {
    $content = mysql_escape_string(serialize($content));

    $query = db_query("SELECT 1 FROM freezer WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $this->namespace, $key, $key);
    if (db_fetch_assoc($query)) {
      db_query("UPDATE freezer SET value = '%s' WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $content, $this->namespace, $key, $key);
    }
    else {
      db_query("INSERT INTO freezer (namespace, id, value) VALUES ('%s', '%s', '%s')", $this->namespace, $key, $content);
    }
  }
}
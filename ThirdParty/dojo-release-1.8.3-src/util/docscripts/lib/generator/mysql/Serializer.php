<?php

require_once('lib/generator/common/db.php');
require_once('lib/generator/common/AbstractSerializer.php');

abstract class Serializer extends AbstractSerializer
{
  private $namespace;
  private $file_location;

  private $file;
  private $length = 9999;

  private $queue;
  private $limit = 50;

  public static function clean($directory, $namespace, $filename='api') {
    db_query("TRUNCATE freezer");
  }

  public function __construct($directory, $suffix, $filename='api') {
    $this->file_location = $directory . '/' . $filename . '.' . $suffix;
    $this->namespace = $filename . '.' . $suffix;
  }

  public function __destruct() {
    $tmp = fopen($this->file_location . '_tmp', 'w');

    foreach ($this->header as $header_line) {
      fwrite($tmp, $header_line . "\n");
    }
    foreach ($this->ids() as $id) {
      foreach (explode("\n", $this->getString($id)) as $line) {
        if ($line) {
          fwrite($tmp, $this->indent . $line . "\n");
        }
      }
    }
    foreach ($this->footer as $footer_line) {
      fwrite($tmp, $footer_line . "\n");
    }

    fclose($tmp);

    if (file_exists($this->file_location)) {
      unlink($this->file_location);
    }

    rename($this->file_location . '_tmp', $this->file_location);
  }

  public function ids() {
    $ids = array();

    $query = db_query("SELECT id FROM freezer WHERE namespace = '%s'", $this->namespace);
    while ($row = db_fetch_assoc($query)) {
      $ids[] = $row['id'];
    }

    return $ids;
  }

  protected function getString($id) {
    $query = db_query("SELECT value FROM freezer WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $this->namespace, $id, $id);
    if ($result = db_fetch_assoc($query)) {
      return $result['value'];
    }
  }

  public function set($id, $value) {
    if (!$id) {
      debug_print_backtrace();
      die("Called set without an ID\n");
    }

    $content = mysql_escape_string($this->toString($value, $id));

    $query = db_query("SELECT 1 FROM freezer WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $this->namespace, $id, $id);
    if (db_fetch_assoc($query)) {
      db_query("UPDATE freezer SET value = '%s' WHERE namespace = '%s' AND id = '%s' AND BINARY id = '%s'", $content, $this->namespace, $id, $id);
    }
    else {
      db_query("INSERT INTO freezer (namespace, id, value) VALUES ('%s', '%s', '%s')", $this->namespace, $id, $content);
    }
  }
}
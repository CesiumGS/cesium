<?php

final class Freezer
{
  protected $key_delimeter = '%%%';

  private $length = 99999;
  private $nodes;
  private $nodes_location = '';
  private $queue;
  private $limit = 500;

  public static function clean($directory, $suffix) {
    $loc = $directory . '/' . $suffix;
    file_exists($loc) && unlink($loc);
  }

  public function __construct($directory, $suffix) {
    $this->queue = array();
    $this->nodes_location = $directory . '/' . $suffix;
    touch($this->nodes_location);
    $this->nodes = fopen($this->nodes_location, 'r');
  }

  public function __destruct() {
    $this->flush();

    fclose($this->nodes);
  }

  public function ids($flush = TRUE) {
    if ($flush) {
      $this->flush();
    }

    $ids = array();

    rewind($this->nodes);
    while (!feof($this->nodes)) {
      $line = stream_get_line($this->nodes, $this->length, "\n");
      list($key,) = explode($this->key_delimeter, $line);
      if (trim($key)) {
        $ids[] = $key;
      }
    }

    return $ids;
  }

  public function open($key, $default) {
    foreach (array_reverse($this->queue) as $queue) {
      list($queue_key, $content) = $queue;
      if ($queue_key == $key) {
        return $content;
      }
    }

    $key .= $this->key_delimeter;
    rewind($this->nodes);
    while (!feof($this->nodes)) {
      $line = stream_get_line($this->nodes, $this->length, "\n");
      if (strlen($line) > strlen($key) && substr($line, 0, strlen($key)) == $key) {
        $line = substr($line, strlen($key));
        return unserialize(str_replace("\\n", "\n", $line));
      }
    }
    return $default;
  }

  public function save($key, $content) {
    $this->queue[] = array($key, $content);
    if (count($this->queue) > $this->limit) {
      $this->flush();
    }
  }

  private function flush() {
    $deferred = array();
    $keys = $this->ids(FALSE);

    foreach ($this->queue as $queue) {
      list($key, $content) = $queue;
      $serialized = $key . $this->key_delimeter . str_replace("\n", "\\n", serialize($content));
      if (!in_array($key, $keys)) {
        $deferred[$key] = $serialized;
        continue;
      }

      $key = $key . $this->key_delimeter;
      $found = false;
      $tmp = fopen($this->nodes_location . '_tmp', 'w');
      rewind($this->nodes);
      while (!feof($this->nodes)) {
        if ($line = stream_get_line($this->nodes, $this->length, "\n")) {
          if (strlen($line) > strlen($key) && substr($line, 0, strlen($key)) == $key) {
            $found = true;
            $line = $serialized;
          }
          if (strlen($line) > $this->length-2) {
            die('Line too long: ' . $line . "\n");
          }
          fwrite($tmp, $line . "\n");
        }
      }
      if (!$found) {
        fwrite($tmp, $key . str_replace("\n", "\\n", serialize($content)) . "\n");
      }
      fclose($tmp);
      fclose($this->nodes);

      unlink($this->nodes_location);
      rename($this->nodes_location . '_tmp', $this->nodes_location);
      $this->nodes = fopen($this->nodes_location, 'r');
    }

    if (!empty($deferred)) {
      fclose($this->nodes);
      copy($this->nodes_location, $this->nodes_location . '_tmp');
      $tmp = fopen($this->nodes_location . '_tmp', 'a');

      foreach ($deferred as $line) {
        fwrite($tmp, $line . "\n");
      }
      fclose($tmp);

      unlink($this->nodes_location);
      rename($this->nodes_location . '_tmp', $this->nodes_location);
      $this->nodes = fopen($this->nodes_location, 'r');
    }

    $this->queue = array();
  }
}

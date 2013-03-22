<?php

require_once('lib/generator/common/AbstractSerializer.php');

abstract class Serializer extends AbstractSerializer
{
  private $file_location;

  private $length = 9999;

  private $data = array();

  public static function clean($directory, $suffix, $filename='api') {
    $loc = $directory . '/' . $filename . '.' . $suffix;
    file_exists($loc) && unlink($loc);
  }

  public function __construct($directory, $suffix, $filename='api') {
    $this->file_location = $directory . '/' . $filename . '.' . $suffix;
    touch($this->file_location);
    $file = fopen($this->file_location, 'r');
    $this->_readFromFile($file);
    fclose($file);
  }

  private function _readFromFile($file) {
    $id = null;
    while (!feof($file)) {
      $line = stream_get_line($file, $this->length, "\n");
      if ($id) {
        $this->data[$id] .= $line . "\n";
        if ($this->lineEnds($line)) {
          $id = null;
        }
      }
      elseif ($id = $this->lineStarts($line)) {
        $this->data[$id] = $line . "\n";
      }
    }
  }

  public function __destruct() {
    $tmp = fopen($this->file_location . '_tmp', 'w');

    foreach ($this->header as $header_line) {
      fwrite($tmp, $header_line . "\n");
    }
    foreach ($this->data as $id => $value) {
      fwrite($tmp, $value . "\n");
    }
    /*foreach ($this->ids() as $id) {
      foreach (explode("\n", $this->getString($id)) as $line) {
        if ($line) {
          fwrite($tmp, $this->indent . $line . "\n");
        }
      }
    }*/
    foreach ($this->footer as $footer_line) {
      fwrite($tmp, $footer_line . "\n");
    }

    fclose($tmp);

    unlink($this->file_location);

    rename($this->file_location . '_tmp', $this->file_location);
  }

  public function ids() {
    return array_keys($this->data);
  }

  protected function getString($id) {
    if(array_key_exists($id, $this->data)){
        return $this->data[$id];
    }
  }

  public function set($id, $value) {
    if (!$id) {
      debug_print_backtrace();
      die("Called set without an ID\n");
    }

    $content = $this->toString($value, $id);

    $this->data[$id] = preg_replace('/^/m', $this->indent, $content);
  }
}

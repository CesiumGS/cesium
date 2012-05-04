<?php

final class Freezer
{
  protected $key_delimeter = '%%%';

  private $length = 99999;
  private $nodes_location = '';
  private $nodes = array();

  public static function clean($directory, $suffix) {
    $loc = $directory . '/' . $suffix;
    file_exists($loc) && unlink($loc);
  }

  public function __construct($directory, $suffix) {
    $this->nodes_location = $directory . '/' . $suffix;
    touch($this->nodes_location);
    $nodes_file = fopen($this->nodes_location, 'r');
    $this->_readFromFile($nodes_file);
    fclose($nodes_file);
  }

  public function __destruct() {
    $this->flush();
  }

  private function _readFromFile($nodes_file) {
    while (!feof($nodes_file)) {
      $line = stream_get_line($nodes_file, $this->length, "\n");
      list($key, $value) = explode($this->key_delimeter, $line);
      
      if (trim($key)) {
        $this->nodes[$key] = $value;
      }
    } 
  }

  public function ids($flush = TRUE) {
    return array_keys($this->nodes);
  }

  public function open($key, $default) {
    if(array_key_exists($key, $this->nodes)){
        return unserialize(str_replace("\\n", "\n", $this->nodes[$key]));
    }
    return $default;
  }

  public function save($key, $content) {
    $this->nodes[$key] =  str_replace("\n", "\\n", serialize($content));
  }

  private function flush() {
    $tmp = fopen($this->nodes_location . '_tmp', 'w');
    foreach ($this->nodes as $key => $value) {
      fwrite($tmp, $key . $this->key_delimeter . $value . "\n");
    }
    fclose($tmp);
    unlink($this->nodes_location);
    rename($this->nodes_location . '_tmp', $this->nodes_location);
  }
}

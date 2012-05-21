<?php

function destroy_all($item) {
  if (is_array($item)) {
    array_walk($item, 'destroy_all');
  }
  else {
    if (is_string($item)) {
      die($item);
    }
    $item->destroy();
  }
}

class Dojo
{
  private $dir;
  public $namespace;

  public function __construct($namespace, $dir){
    $this->setDir($dir);
    $this->namespace = $namespace;
  }
  
  public function __destruct() {
    unset($this->dir);
    unset($this->namespace);
  }

  public function getPackage($file){
    return new DojoPackage($file);
  }

  public function getDir(){
    return $this->dir;
  }

  public function setDir($dir){
    $this->dir = $dir;
  }

  public function getFileList($dir = false, $recurse = false){
    $output = array();
    if ($dir === false) {
      $dir = $this->getDir();
    }

    if (!$recurse) {
      $old_dir = getcwd();
      if (!is_dir($dir)) {
        return array();
      }
      chdir($dir);
      $dir = '.';
    }
    $files = scandir($dir);

    foreach ($files as $file) {
      if ($file{0} == '.') continue;
      if (is_dir($dir . '/' . $file)) {
        if ($recurse) {
          $file = $dir . '/' . $file;
        }
        $output = array_merge($output, $this->getFileList($file, true));
      }else{
        if (substr($file, -3) == '.js' && substr($file, -6) != '.xd.js') {
          if ($recurse) {
            $file = $dir . '/' . $file;
          }
          $output[] = $file;
        }
      }
    }

    if (!$recurse) {
      chdir($old_dir);
    }
    return $output;
  }
}

?>
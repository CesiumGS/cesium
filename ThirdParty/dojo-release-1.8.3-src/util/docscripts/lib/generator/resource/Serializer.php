<?php

require_once('lib/generator/common/AbstractSerializer.php');

abstract class Serializer extends AbstractSerializer
{
  private $directory;
  private $suffix;

  private $file;
  private $length = 9999;

  private $queue;
  private $limit = 50;

  public static function clean($directory, $suffix, $filename='provides') {
    $directory .= '/provides';
    if (!file_exists($directory)) {
      mkdir($directory);
      chmod($directory, 0755);
    }
    $suffix = '.' . $suffix;
    $from = -strlen($suffix);
    foreach (scandir($directory) as $file) {
      if (substr($file, $from) == $suffix) {
        file_exists($directory . '/' . $file) && unlink($directory . '/' . $file);
      }
    }
  }

  public function __construct($directory, $suffix, $filename='provides') {
    $this->directory = $directory . '/provides';
    if (!file_exists($this->directory)) {
      mkdir($this->directory);
      chmod($this->directory, 0755);
    }
    $this->suffix = '.' . $suffix;
  }

  public function ids() {
    $ids = array();

    $from = -strlen($this->suffix);
    foreach (scandir($this->directory) as $file) {
      if (substr($file, $from) == $this->suffix) {
        $file = fopen($this->directory . '/' . $file, 'r');
        while (!feof($file)) {
          $line = stream_get_line($file, $this->length, "\n");
          if ($started && $this->lineEnds($line)) {
            $started = false;
            continue;
          }
          elseif ($id = $this->lineStarts($line)) {
            $started = true;
            $ids[] = $id;
          }
        }
      }
    }

    return array_unique($ids);
  }

  protected function getString($id, $include_queue = TRUE) {
    return '';
  }

  public function set($id, $value) {
  }

  public function setObject($id, $value) {
    $pretty = $this->toAbstract($value, $id);
    $provides = $this->extractProvides($pretty);
    $updates = array();
    $lookups = array(array('#properties', '#property'), array('#methods', '#method'));
    foreach ($lookups as $list) {
      list($types, $type) = $list;
      if ($pretty[$types]) {
        foreach ($pretty[$types][0][$type] as $item) {
          foreach ($this->extractProvides($item, $provides) as $provide => $item) {
            $updates[$provide][$types][$item['@name']] = $item;
            if (!array_key_exists($provide, $provides)) {
              $provides[$provide] = array();
            }
            // $provides[$provide][$types][0][$type][] = $item;
          }
        }
      }
    }

    foreach ($provides as $provide => $provide_value) {
      $file_name = $this->directory . '/' . $provide . $this->suffix;

      $found = false;
      $output = implode("\n", $this->header) . "\n";
      if (file_exists($file_name)) {
        $contents = substr(file_get_contents($file_name), strlen(implode("\n", $this->header))+1, -strlen(implode("\n", $this->footer))-1);
        $buffer = array();
        foreach (explode("\n", $contents) as $line) {
          if (!empty($buffer) && $this->lineEnds($line)) {
            $buffer[] = $line;
            $found = true;
            $saved = array();
            $raw = $this->linesToRaw($buffer);
            $object = $this->toObject($raw);

            foreach ($lookups as $list) {
              list($types, $type) = $list;
              if ($object[$types]) {
                foreach ($object[$types][0][$type] as $item) {
                  $saved[$types][$item['@name']] = $item;
                }
              }
              if (isset($updates[$provide][$types])) {
                foreach ($updates[$provide][$types] as $item) {
                  $saved[$types][$item['@name']] = $item;
                }
              }
            }

            foreach ($saved as $types => $item) {
              $provide_value[$types][0][$type][] = $item;
            }

            $raw = $this->convertToRaw($provide_value);
            foreach (explode("\n", $this->toString($raw, $id)) as $line) {
              $output .= $this->indent . $line . "\n";
            }

            $buffer = array();
          }
          elseif ($this->lineStarts($line) == $id) {
            $buffer[] = substr($line, strlen($this->indent));
          }
          else {
            $output .= $line . "\n";
          }
        }
      }

      if (!$found) {
        foreach ($lookups as $list) {
          list($types, $type) = $list;
          if (isset($updates[$provide][$types])) {
            foreach ($updates[$provide][$types] as $item) {
              $provide_value[$types][0][$type][] = $item;
            }
          }
        }
        $raw = $this->convertToRaw($provide_value);
        foreach (explode("\n", $this->toString($raw, $id)) as $line) {
          $output .= $this->indent . $line . "\n";
        }
      }

      $output .= implode("\n", $this->footer);
      file_put_contents($file_name, $output);
    }
  }

  private function extractProvides($value) {
    $provides = array();
    if ($value['#provides']) {
      foreach ($value['#provides'] as $provide) {
        foreach ($provide['#provide'] as $content) {
          unset($value['#resources']);
          unset($value['#provides']);
          unset($value['#properties']);
          unset($value['#methods']);
          $provides[$content['content']] = $value;
        }
      }
    }
    return $provides;
  }
}

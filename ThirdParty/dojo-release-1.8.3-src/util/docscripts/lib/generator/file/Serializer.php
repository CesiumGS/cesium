<?php

require_once('lib/generator/common/AbstractSerializer.php');

abstract class Serializer extends AbstractSerializer
{
  private $file_location;

  private $file;
  private $length = 9999;

  private $queue;
  private $limit = 50;

  public static function clean($directory, $suffix, $filename='api') {
    $loc = $directory . '/' . $filename . '.' . $suffix;
    file_exists($loc) && unlink($loc);
  }

  public function __construct($directory, $suffix, $filename='api') {
    $this->queue = array();
    $this->file_location = $directory . '/' . $filename . '.' . $suffix;
    touch($this->file_location);
    $this->file = fopen($this->file_location, 'r');
  }

  public function __destruct() {
    $this->flush();

    fclose($this->file);
  }

  public function ids($flush = TRUE) {
    if ($flush) {
      $this->flush();
    }

    $ids = array();
    $started = false;

    rewind($this->file);
    while (!feof($this->file)) {
      $line = stream_get_line($this->file, $this->length, "\n");
      if ($started && $this->lineEnds($line)) {
        $started = false;
        continue;
      }
      elseif ($id = $this->lineStarts($line)) {
        $started = true;
        $ids[] = $id;
      }
    }

    return $ids;
  }

  protected function getString($id, $include_queue = TRUE) {
    if ($include_queue) {
      foreach (array_reverse($this->queue) as $queue) {
        list($queue_id, $value) = $queue;
        if ($queue_id == $id) {
          return $this->toString($value, $id);
          break;
        }
      }
    }

    $lines = array();
    $started = false;
    $strlen = strlen($this->indent);

    rewind($this->file);
    while (!feof($this->file)) {
      $line = stream_get_line($this->file, $this->length, "\n");
      if ($started) {
        $lines[] = substr($line, $strlen);
        if ($this->lineEnds($line)) {
          return implode("\n", $lines) . "\n";
        }
      }
      elseif ($this->lineStarts($line) == $id) {
        $started = true;
        $lines[] = substr($line, $strlen);
      }
    }
  }

  public function set($id, $value) {
    $this->queue[] = array($id, $value);
    if (count($this->queue) > $this->limit) {
      $this->flush();
    }
  }

  public function flush() {
    $deferred = array();
    $ids = $this->ids(FALSE);

    foreach ($this->queue as $position => $queue) {
      list($id, $value) = $queue;
      $last = ($position + 1 == count($this->queue));
      $tostring = $this->toString($value, $id);
      if (!in_array($id, $ids)) {
        if (!$last) {
          $deferred[$id] = $tostring;
          continue;
        }
      }

      if (!$id) {
        debug_print_backtrace();
        die("Called set without an ID\n");
      }

      if ($tostring == $this->getString($id, FALSE)) {
        continue;
      }

      $lines = array();
      $started = false;
      $found = false;
      $header = false;
      $buffer = array();

      $tmp = fopen($this->file_location . '_tmp', 'w');
      foreach ($this->header as $header_line) {
        fwrite($tmp, $header_line . "\n");
      }

      rewind($this->file);
      while (!feof($this->file)) {
        $line = stream_get_line($this->file, $this->length, "\n");
        if (!trim($line)) {
          continue;
        }

        if ($started) {
          $lines[] = $line;
          if ($this->lineEnds($line)) {
            $lines = explode("\n", $tostring);
            foreach ($lines as $line) {
              fwrite($tmp, $this->indent . $line . "\n");
            }
            $started = false;
            $found = true;
          }
        }
        elseif (!$found && $this->lineStarts($line) == $id) {
          foreach ($buffer as $line) {
            fwrite($tmp, $line . "\n");
          }
          $buffer = array();
          $started = true;
          $lines[] = $line;
        }
        else {        
          // Search through non-block data for headers first, then footers
          if (!isset($searching)) {
            $searching = $this->header;
          }

          $buffer[] = $line;
          if (count($buffer) == count($searching) && count(array_intersect($buffer, $searching)) == count($searching)) {
            // Successful match
            if ($searching === $this->header) {
              $buffer = array();
              $searching = $this->footer;
            }
            else {
              // Break before the footer is added
              break;
            }
          }
          elseif(count($buffer) > count($searching)) {
            fwrite($tmp, array_shift($buffer) . "\n");
          }
        }
      }

      if (!$found) {
        if ($last) {
          foreach ($deferred as $lines) {
            foreach (explode("\n", $lines) as $line) {
              fwrite($tmp, $this->indent . $line . "\n");
            }
          }
        }
        $lines = explode("\n", $tostring);
        foreach ($lines as $line) {
          fwrite($tmp, $this->indent . $line . "\n");
        }
      }

      foreach ($this->footer as $footer_line) {
        fwrite($tmp, $footer_line . "\n");
      }

      fclose($tmp);
      fclose($this->file);

      unlink($this->file_location);
      rename($this->file_location . '_tmp', $this->file_location);
      $this->file = fopen($this->file_location, 'r');
    }

    $this->queue = array();
  }
}

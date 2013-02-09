<?php

class JsonSerializer extends Serializer
{
  protected $header = array('{');
  protected $footer = array('}');

  protected function lineStarts($line) {
    if (preg_match('%^\t"([^"]+)": {%', $line, $match)) {
      return $match[1];
    }
  }

  protected function lineEnds($line) {
    if (preg_match('%^\t}%', $line, $match)) {
      return true;
    }
  }

  protected function linesToRaw($lines) {
    $lines[0] = '{';
    $lines[count($lines)-1] = '}';
    return json_decode(implode("\n", $lines));
  }

  public function toObject($raw, $id=null) {
    return $raw;
  }

  public function toString($raw, $id=null) {
    if (!$id) {
      if (!($id = $raw['id'])) {
        throw new Exception('toString must be passed an ID or raw object must contain and ID');
      }
    }

    $tab = "\t";
    $new_json = "\"$id\": ";
    $indent_level = 0;
    $in_string = false;

    $json = json_encode($raw);
    $len = strlen($json);

    for ($c = 0; $c < $len; $c++) {
      $char = $json{$c};
      switch($char) {
      case '{':
      case '[':
        if (!$in_string) {
          $new_json .= $char . "\n" . str_repeat($tab, ++$indent_level);
        }
        else {
          $new_json .= $char;
        }
        break;
      case '}':
      case ']':
        if(!$in_string) {
          $new_json .= "\n" . str_repeat($tab, --$indent_level) . $char;
        }
        else {
          $new_json .= $char;
        }
        break;
      case ',':
        if (!$in_string) {
          $new_json .= ",\n" . str_repeat($tab, $indent_level);
        }
        else {
          $new_json .= $char;
        }
        break;
      case ':':
        if (!$in_string) {
          $new_json .= ": ";
        }
        else {
          $new_json .= $char;
        }
        break;
      case '"':
        if($c > 0 && $json[$c-1] != '\\') {
          $in_string = !$in_string;
        }
      default:
        $new_json .= $char;
        break;
      }
    }

    return $new_json . ",\n";
  }

  protected function descend($node, $object) {
    if (!is_array($object) && !is_object($object)) {
      return $object;
    }

    foreach ($object as $key => $value) {
      switch ($key{0}) {
      case '@':
        $node[substr($key, 1)] = $value;
        break;
      case '#':
        if ($key == '#mixins') {
          foreach ($value as $mixins) {
            $scope = $mixins['@scope'];
            foreach ($mixins['#mixin'] as $mixin) {
              $node['mixins'][$scope][] = $this->descend(array(), $mixin);
            }
          }
        }
        elseif (count($value) == 1 && !in_array($key, array('#property', '#method', '#resource', '#parameter', '#provide', '#return-type'))) {
          $node[substr($key, 1)] = $this->descend(array(), $value[0]);
        }
        else {
          foreach ($value as $child) {
            $node[] = $this->descend(array(), $child);
          }
        }
        break;
      default:
        if ($key === 'content') {
          if (count($object) == 1) {
            return $value;
          }
          $node['content'] = $value;
        }
      }
    }

    return $node;
  }

  public function convertToRaw($object) {
    return $this->descend(array(), $object);
  }
}

?>
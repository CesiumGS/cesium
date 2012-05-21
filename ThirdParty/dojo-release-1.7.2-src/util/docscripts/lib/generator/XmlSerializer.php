<?php

class XmlSerializer extends Serializer
{
  protected $header = array('<?xml version="1.0" encoding="UTF-8"?>', '<javascript>');
  protected $footer = array('</javascript>');

  protected function lineStarts($line) {
    if (preg_match('%^\t<object [^>]*location="([^"]+)"%', $line, $match)) {
      return $match[1];
    }
  }

  protected function lineEnds($line) {
    if (preg_match('%^\t</object>$%', $line, $match)) {
      return true;
    }
  }

  protected function linesToRaw($lines) {
    return DOMDocument::loadXML(implode("\n", $lines));
  }

  public function toObject($raw, $id=null) {
    return $this->ascend($raw, $raw->firstChild);
  }

  public function ascend($document, $node) {
    $object = array();

    if ($node->hasAttributes()) {
      if ($node->attributes) {
        foreach ($node->attributes as $attribute) {
          $value = $attribute->value;
          if ($value == 'true') {
            $value = true;
          }
          elseif ($value == 'false') {
            $value = false;
          }
          $object['@' . $attribute->name] = $value;
        }
      }
    }
    if ($node->childNodes) {
      foreach ($node->childNodes as $child_node) {
        if ($child_node->tagName) {
          $object['#' . $child_node->tagName][] = $this->ascend($document, $child_node);
        }
        else {
          // Text node
          $object['content'] = $node->nodeValue;
        }
      }
    }

    return $object;
  }

  public function toString($raw, $id=null) {
    if (!$id) {
      if (!($id = $raw->firstChild->getAttribute('location'))) {
        throw new Exception('toString must be passed an ID or raw object must contain and ID');
      }
    }

    $lines = explode("\n", str_replace('<?xml version="1.0" encoding="UTF-8"?>' . "\n", '', $raw->saveXML()));
    foreach ($lines as $i => $line) {
      $indent = 0;
      while (substr($line, 0, 2) == '  ') {
        ++$indent;
        $line = substr($line, 2);
      }
      $lines[$i] = str_repeat("\t", $indent) . $line;
    }

    if (count($lines) && substr($lines[0], -2) == '/>') {
      $lines[0] = substr($lines[0], 0, -2) . '>';
      array_splice($lines, 1, 0, array('</object>'));
    }

    return implode("\n", $lines);
  }

  protected function descend($document, $node, $object) {
    foreach ($object as $key => $value) {
      if (is_bool($value)) {
        $value = $value ? 'true' : 'false';
      }
      switch ($key{0}) {
      case '@':
        $node->setAttribute(substr($key, 1), $value);
        break;
      case '#':
        foreach ($value as $child) {
          $this->descend($document, $node->appendChild($document->createElement(substr($key, 1))), $child);
        }
        break;
      default:
        if ($key === 'content') {
          $node->appendChild($document->createTextNode($value));
        }
      }
    }
  }

  public function convertToRaw($object) {
    $document = new DOMDocument('1.0', 'UTF-8');
    $document->preserveWhiteSpace = true;
    $document->formatOutput = true;

    $this->descend($document, $document->appendChild($document->createElement('object')), $object);

    return $document;
  }
}

?>
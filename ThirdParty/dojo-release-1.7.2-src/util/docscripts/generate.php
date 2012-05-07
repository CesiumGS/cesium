<?php

# php generate.php
# -- Runs everything in the modules directory
# php generate.php dojo
# php generate.php dijit
# php generate.php dojox
# -- Runs only the module starting with custom, custom2, etc.
# php generate.php --store=file
# php generate.php --store=mysql --db_host=localhost --db_user=api --db_password=password --db_name=api
# -- Specifies storage type. "hash", "file" and "resource" currently supported
# php generate.php --serialize=xml,json
# -- Comma-separated list of serializations. "xml" and "json" supported
# php generate.php --outfile=custom-api custom
# -- Runs the custom module, serializes to custom-api.xml

if (isset($_SERVER['HTTP_HOST'])) {
  die('Run from command line');
}

ini_set('memory_limit', '256M');
ini_set('display_errors', 1);
error_reporting(E_ALL ^ E_NOTICE);
$debug = true;

require_once('lib/parser2/dojo2.inc');

$keys = array();
$namespaces = array();

// Do this in 3 parts
// 1. Turn all variables into single objects
// 2. Internalize class members
// 3. Serialize objects

$args = array();
$kwargs = array();
$clean = false;
$db_host = 'localhost';
$db_user = 'root';
$db_password = '';
$db_name = 'generate';
foreach (array_slice($argv, 1) as $arg) {
  if ($arg{0} == '-') {
    if (preg_match('%^--(outfile|store|serialize|db_host|db_user|db_password|db_name)=([^ ]+)$%', $arg, $match)) {
      if ($match[1] == 'db_host') {
        $db_host = $match[2];
      }
      elseif ($match[1] == 'db_user') {
        $db_user = $match[2];
      }
      elseif ($match[1] == 'db_password') {
        $db_password = $match[2];
      }
      elseif ($match[1] == 'db_name') {
        $db_name == $match[2];
      }
      elseif ($match[1] == 'serialize') {
        foreach (explode(',', $match[2]) as $serialize_type) {
          $kwargs[$match[1]][$serialize_type] = true;
        }
      }
      else {
        $kwargs[$match[1]] = $match[2];
      }
    }
    elseif ($arg == '--clean') {
      $clean = true;
    }
    else {
      die("ERROR: Unrecognized argument: $arg\n");
    }
  }
  else {
    $args[] = $arg;
  }
}
if (!isset($kwargs['serialize'])) {
  $kwargs['serialize'] = array(
    'json' => true,
    'xml' => true
  );
}
// Use hash storage by default
if (!isset($kwargs['store'])) {
  $kwargs['store'] = 'hash';
}

require_once('lib/generator/' . $kwargs['store'] . '/Freezer.php');
require_once('lib/generator/' . $kwargs['store'] . '/Serializer.php');
require_once('lib/generator/JsonSerializer.php');
require_once('lib/generator/XmlSerializer.php');

if ($clean) {
  Freezer::clean('cache', 'nodes');
  Freezer::clean('cache', 'resources');
  if ($kwargs['outfile']) {
    if (isset($kwargs['serialize']['json'])) {
      JsonSerializer::clean('cache', 'json', $kwargs['outfile']);
    }
    if (isset($kwargs['serialize']['xml'])) {
      XmlSerializer::clean('cache', 'xml', $kwargs['outfile']);
    }
  }
  else {
    if (isset($kwargs['serialize']['json'])) {
      JsonSerializer::clean('cache', 'json');
    }
    if (isset($kwargs['serialize']['xml'])) {
      XmlSerializer::clean('cache', 'xml');
    }
  }
}

$files = dojo_get_files($args);
$nodes = new Freezer('cache', 'nodes');
$resources = new Freezer('cache', 'resources');

print "=== PARSING FILES ===\n";
flush();

foreach ($files as $set){
  list($namespace, $file) = $set;
  if (!$namespaces[$namespace]) {
    $namespaces[$namespace] = true;
  }

  $ctime = dojo_get_file_time($namespace, $file);
  if ($ctime == $resources->open($namespace . '%' . $file, null)) {
    continue;
  }

  printf("%-100s %6s KB\n", $namespace . '/' . $file, number_format(memory_get_usage() / 1024));
  flush();

  $contents = dojo_get_contents($namespace, $file);

  $provides = $contents['#provides'];
  unset($contents['#provides']);
  $resource = $contents['#resource'];
  unset($contents['#resource']);
  $requires = $contents['#requires'];
  unset($contents['#requires']);

  // set by debugging in parsing
  unset($contents['#debug']);
  unset($contents['#unwrapped_source']);
  unset($contents['#raw_source']);

  foreach ($contents as $var => $content) {
    foreach ($content as $key_key => $key_value) {
      $key_type = 'undefined';
      if (is_numeric($key_value)) {
        $key_type = 'numeric';
      }elseif(is_array($key_value)) {
        $key_type = 'array';
      }elseif(is_bool($key_value)) {
        $key_type = 'bool';
      }elseif(is_string($key_value)) {
        $key_type = 'string';
      }
      $keys[$key_key][] = $key_type;
      $keys[$key_key] = array_unique($keys[$key_key]);
    }

    $node = $nodes->open($var, array());

    $new = !empty($node);

    // Handle file-level information
    if ($provides && (!is_array($node['#provides']) || !in_array($provides, $node['#provides']))) {
      $node['#provides'][] = $provides;
    }

    if (!is_array($node['#namespaces']) || !in_array($namespace, $node['#namespaces'])) {
      $node['#namespaces'][] = $namespace;
    }

    $node['#resource'][] = "$namespace/$resource";

    if (trim($content['type']) && (empty($node['type']) || $content['type'] != 'Object')) {
      $node['type'] = $content['type'];
    }

    if (!empty($content['tags'])) {
      $node['tags'] = $content['tags'];
    }

    if (!empty($content['private'])) {
      $node['private'] = $content['private'];
    }

    if (!empty($content['private_parent'])) {
      $node['private_parent'] = $content['private_parent'];
    }

    if (trim($content['summary'])) {
      $node['summary'] = $content['summary'];
    }

    if (trim($content['description'])) {
      $node['description'] = $content['description'];
    }

    if (trim($content['exceptions'])) {
      $node['exceptions'] = $content['exceptions'];
    }

    if ($content['private']) {
      $node['private'] = $content['private'];
    }

    if ($content['private_parent']) {
      $node['private_parent'] = $content['private_parent'];
    }

    if (is_array($content['alias'])) {
      foreach ($content['alias'] as $alias) {
        $node['alias'] = $alias;
      }
    }

    if (is_array($content['examples'])) {
      foreach ($content['examples'] as $example) {
        if (!is_array($node['examples']) || !in_array($example, $node['examples'])) {
          $node['examples'][] = $example;
        }
      }
    }

    if ($content['instance']) {
      $node['instance'] = $content['instance'];
    }
    
    if ($content['prototype']) {
      $node['prototype'] = $content['prototype'];
    }

    if (!is_array($node['returns'])) {
      $node['returns'] = array();
    }
    if (trim($content['returns'])) {
      $node['returns'] = array_unique(array_merge($node['returns'], explode('|', $content['returns'])));
    }

    if (trim($content['return_summary'])) {
      $node['return_summary'] = $content['return_summary'];
    }

    foreach (array('prototype', 'instance', 'normal') as $scope) {
      if (!empty($content['mixins'][$scope])) {
        if (empty($node['mixins'][$scope])) {
          $node['mixins'][$scope] = array();
        }
        if (!is_array($content['mixins'][$scope])) {
          print $content['mixins'][$scope];
        }
        $node['mixins'][$scope] = array_unique(array_merge($node['mixins'][$scope], $content['mixins'][$scope]));
      }
    }

    if ($content['type'] == 'Function') {
      if ($content['classlike']) {
        $node['classlike'] = true;
      }

      if ($node['chains']) {
        if (!$content['chains']['prototype']) {
          $content['chains']['prototype'] = array();
        }
        $node['chains']['prototype'] = array_unique(array_merge($node['chains']['prototype'], $content['chains']['prototype']));
        if (!$content['chains']['call']) {
          $content['chains']['call'] = array();
        }
        $node['chains']['call'] = array_unique(array_merge($node['chains']['call'], $content['chains']['call']));
      }
      else {
        $node['chains']['prototype'] = ($content['chains']['prototype']) ? $content['chains']['prototype'] : array();
        $node['chains']['call'] = ($content['chains']['call']) ? $content['chains']['call'] : array();
      }

      if ($content['chains']) {
        unset($content['chains']['prototype']);
        unset($content['chains']['call']);
        $types = array_keys($content['chains']);
        if (!empty($types)) {
          print_r($types);
          die('Unexpected chain type');
        }
      }

      if (!empty($content['parameters'])) {
        if (!empty($node['parameters'])) {
          $node_parameters = array_keys($node['parameters']);
          $content_parameters = array_keys($content['parameters']);
          $long_parameters = (count($node_parameters) > count($content_parameters)) ? $node_parameters : $content_parameters;
          $short_parameters = (count($node_parameters) >  count($content_parameters)) ? $content_parameters : $node_parameters;

          $match = true;
	  $total_short = count($short_parameters);
          foreach ($long_parameters as $i => $parameter) {
            if ($i < $total_short && $parameter != $short_parameters[$i]) {
              $match = false;
            }
          }

          if ($match) {
            // Only process these if they match the first occurence
            foreach ($content['parameters'] as $parameter_name => $parameter) {
              if (empty($node['parameters'][$parameter_name]['type'])) {
                $node['parameters'][$parameter_name]['type'] = $parameter['type'];
              }
              if (trim($parameter['summary'])) {
                $node['parameters'][$parameter_name]['summary'] = $parameter['summary'];
              }
            }
          }
        }
        else {
          $node['parameters'] = $content['parameters'];
        }
      }
    }

    $nodes->save($var, $node);
  }

  $resources->save($namespace . '%' . $file, $ctime);

  // print_r($keys);
}

unset($resources);

print "=== BUILDING OBJECT STRUCTURE ===\n";
flush();

$roots = array();
$ids = $nodes->ids();

$percent = 0;

$total = count($ids);
$count_args = count($args);
foreach ($ids as $pos => $id) {
  $new_percent = floor($pos / $total * 50);
  if ($new_percent % 5 == 0 && $percent % 5 != 0) {
    print $new_percent . "%\n";
  }
  $percent = $new_percent;

  $parts = explode('.', $id);
  if (count($parts) > 1) {
    $name = array_pop($parts);
    $parent = implode('.', $parts);

    $node = $nodes->open($id, array());
    if (!is_array($node['#namespaces']) || ($count_args && !count(array_intersect($args, $node['#namespaces'])))) {
      continue;
    }
    if (!array_key_exists($parent, $roots)) {
      $roots[$parent] = array();
    }
    if ($node['type'] == 'Function') {
      $roots[$id]['function'] = true;
    }
    if ($node['classlike']) {
      $roots[$id]['classlike'] = true;
    }
  }
}

// Figure out whether a root item has children or not
$pos = 0;
$root_count = count($roots);
$has_children_map = array();
$rootids = array_keys($roots);
//descending sort rootids, so children are processed before parents
rsort($rootids);
foreach ($rootids as $id) {
  $root = $roots[$id];
  $new_percent = floor(50 + ($pos++ / $root_count * 50));
  if ($new_percent % 5 == 0 && $percent % 5 != 0) {
    print floor($new_percent) . "%\n";
  }
  $percent = $new_percent;

  $parts = explode('.', $id);
  $parts_count = count($parts);
  if ($parts_count > 1) {
    if ($root['function'] && !$root['classlike']) {
      if(!array_key_exists($id, $has_children_map)){
          unset($roots[$id]);
      }
    }

    $name = array_pop($parts);
    $parent_id = implode('.', $parts);
    $obj = array("name"=>$name, "id"=>$id);
    if(array_key_exists($parent_id, $has_children_map)) {
      array_push($has_children_map[$parent_id], $obj);
    }
    else{
      $has_children_map[$parent_id] = array($obj);
    }
  }
}

print "=== SERIALIZING OBJECTS ===\n";

// Aggregate and save
$serializers = array();
if ($kwargs['outfile']) {
  if (isset($kwargs['serialize']['json'])) {
    $serializers['json'] = new JsonSerializer('cache', 'json', $kwargs['outfile']);
  }
  if (isset($kwargs['serialize']['xml'])) {
    $serializers['xml'] = new XmlSerializer('cache', 'xml', $kwargs['outfile']);
  }
}
else {
  if (isset($kwargs['serialize']['json'])) {
    $serializers['json'] = new JsonSerializer('cache', 'json');
  }
  if (isset($kwargs['serialize']['xml'])) {
    $serializers['xml'] = new XmlSerializer('cache', 'xml');
  }
}

foreach ($roots as $id => $root) {
  if(!$id){
    // Minor bug
    continue;
  }

  $node = $nodes->open($id, null);

  if(array_key_exists($id, $has_children_map)){
    foreach ($has_children_map[$id] as $child) {
      $node['#children'][$child['name']] = $nodes->open($child['id'], null);
    }
  }

  printf("%-100s %6s KB\n", $id, number_format(memory_get_usage() / 1024));
  flush();

  foreach ($serializers as $serializer) {
    $serializer->setObject($id, $node);
  }
}

// * Assemble parent/child relationships

?>

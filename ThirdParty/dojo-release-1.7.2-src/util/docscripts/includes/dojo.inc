<?php

require_once('lib/parser/Dojo.php');
require_once('lib/parser/DojoPackage.php');

DojoFunctionBody::$suffix = ':';

$_dojo_properties_modules = array();

function _dojo_get_namespaces($limit=null){
  static $namespaces;
  if (!isset($namespaces)) {
    $namespaces = array();
    $files = scandir('modules');
    foreach ($files as $file) {
      if (substr($file, -7) == '.module') {
        $namespace = substr($file, 0, -7);
        if (!$limit || in_array($namespace, $limit)) {
          include_once('modules/' . $file);
          $namespaces[] = substr($file, 0, -7);
        }
      }
      elseif (substr($file, -18) == '.module.properties') {
        $namespace = substr($file, 0, -18);
        if (!$limit || in_array($namespace, $limit)) {
          global $_dojo_properties_modules;
          foreach (preg_split('%[\n\r]+%', file_get_contents('modules/' . $file)) as $line) {
            list($line, ) = preg_split('%[!#]%', $line, 2);
            if ($line = trim($line)) {
              list($key, $line) = explode('=', $line, 2);
              $key = str_replace('\\ ', ' ', trim($key));
              $line = preg_replace('%^\s+%', '', $line);
              if ($key == 'location') {
                $line = _dojo_ensure_directory($line);
              }
              $_dojo_properties_modules[$namespace][$key] = $line;
            }
          }
          $namespaces[] = substr($file, 0, -18);
        }
      }
    }
  }
  return $namespaces;
}

function dojo_get_include($node, $provide) {
  if ($node->jsdoc_project_name == $provide->title) {
    return 'Included automatically';
  }
  else {
    return 'dojo.require("%s");';
  }
}

function _dojo_ensure_directory($directory) {
  if (!is_dir($directory)) {
    die("$directory is not a directory\n");
  }
  else {
    if(substr($directory, -1) != '/'){
      $directory .= '/';
    }
  }
  return $directory;
}

function dojo_get_file_time($namespace, $file) {
  if (function_exists($namespace . '_code_location')) {
    return filectime(_dojo_ensure_directory(call_user_func($namespace . '_code_location')) . $file);
  }
  else {
    global $_dojo_properties_modules;
    return filectime($_dojo_properties_modules[$namespace]['location'] . $file);
  }
}

function dojo_get_files($limit=null) {
    $namespaces = _dojo_get_namespaces($limit);
    $files = array();
    foreach ($namespaces as $namespace) {
        if (function_exists($namespace . '_code_location')) {
          $location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
        }
        else {
          global $_dojo_properties_modules;
          $location = $_dojo_properties_modules[$namespace]['location'];
        }
        if (!$location) die($namespace . '_code_location does not return useful result');
        $dojo = new Dojo($namespace, $location);
        $list = $dojo->getFileList();
        foreach ($list as $i => $item) {
            // Skip internationalization/tests/demos files
            if (preg_match('%(^|/|\\\\)(nls|tests|demos)(\\\\|/)%', $item)) {
              unset($list[$i]);
              continue;
            }
            $list[$i] = array($namespace, $item);
        }
        $files = array_merge($files, array_values($list));
    }

    return $files;
}

function dojo_get_conditions() {
    return array('svg', 'vml');
}

function dojo_get_environments() {
    return array(
        'common' => array(
            'browser' => true
        )
    );
}

function dojo_get_contents($namespace, $file_name) {
  $output = array();

  if (function_exists($namespace . '_code_location')) {
    $location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
  }
  else {
    global $_dojo_properties_modules;
    $location = $_dojo_properties_modules[$namespace]['location'];
  }

  $dojo = new Dojo($namespace, $location);
  $package = new DojoPackage($dojo, $file_name);

  $output['#provides'] = $package->getPackageName();
  $output['#resource'] = $package->getResourceName();

  if ($output['#provides'] == 'null' || !$output['#resource'] == 'null') return array();

  $compound_calls = $package->getFunctionCalls('dojo.kwCompoundRequire');
  // Handle compound require calls
  foreach ($compound_calls as $call) {
    if ($call->getParameter(0)->isA(DojoObject)) {
      $object = $call->getParameter(0)->getObject();
      foreach ($object->getValues() as $key => $values) {
        foreach ($values as $value) {
          if ($value->isA(DojoArray)) {
            foreach ($value->getArray()->getItems() as $item) {
              if ($item->isA(DojoString)) {
                $output['#requires'][] = array($key, $item->getString());
              }
              elseif ($item->isA(DojoArray)) {
                $item = $item->getArray();
                if ($item->getItem(0)->isA(DojoString)) {
                  $output['#requires'][] = array($key, $item->getItem(0)->getString());
                }
              }
            }
          }
        }
      }
    }
  }
  unset($compound_calls);
  unset($call);
  unset($object);
  unset($key);
  unset($value);
  unset($item);

  $require_calls = $package->getFunctionCalls('dojo.require');
  // Handle dojo.require calls
  foreach ($require_calls as $call) {
    $require = $call->getParameter(0);
    if ($require->isA(DojoString)) {
      $output['#requires'][] = array('common', $require->getString());
    }
  }
  unset($require_calls);
  unset($call);
  unset($require);

  $require_if_calls = array_merge($package->getFunctionCalls('dojo.requireIf'), $package->getFunctionCalls('dojo.requireAfterIf'));
  // Handle dojo.requireAfterIf calls
  foreach ($require_if_calls as $call) {
    $environment = $call->getParameter(0);
    $require = $call->getParameter(1);
    if ($environment && $require) {
      $environment = $environment->getValue();
      $require = $require->getValue();

      unset($env);
      unset($req);

      if ($require instanceof DojoString) {
        $req = $require->getValue();
      }
      if ($environment instanceof DojoString) {
        $env = $environment->getValue();
      }
      elseif ($environment instanceof DojoVariable) {
        $environment = $environment->getValue();
        if ($environment == "dojo.isBrowser") {
          $env = 'browser';
        }
        elseif ($environment == "dojo.render.svg.capable") {
          $env = 'svg';
        }
        elseif ($environment == "dojo.render.vml.capable") {
          $env = 'vml';
        }
        elseif (preg_match('%^dojox.gfx.render\s*=\s*"([a-z]+)"%', $environment, $match)) {
          $env = $match[1];
        }
      }
      if ($env && $req) {
        $output['#requires'][] = array($env, $req);
      }
    }
  }
  unset($require_if_calls);
  unset($call);
  unset($environment);
  unset($require);
  unset($env);
  unset($req);

  $declare_calls = array_merge($package->getFunctionCalls('dojo.declare'), $package->getFunctionCalls('d.declare'), $package->getFunctionCalls('dojo.widget.defineWidget'));
  // This closely matches dojo.widget.defineWidget as declared in src/widget/Widget.js
  foreach ($declare_calls as $call) {
    $init = null;
    if ($call->getName() == 'dojo.declare' || $call->getName() == 'd.declare') {
      $args = array($call->getParameter(0), null, $call->getParameter(1), $call->getParameter(2), $call->getParameter(3));
      $name = $args[0]->getString();
      if ($args[3]->isA(DojoFunctionDeclare)) {
        $init = $args[3]->getFunction();
      }
      if ($args[3]->isA(DojoObject)) {
        $args[4] = $args[3];
        $args[3] = null;
      }
    }
    else {
      if ($call->getParameter(3)->isA(DojoString)) {
        $args = array($call->getParameter(0), $call->getParameter(3), $call->getParameter(1), $call->getParameter(4), $call->getParameter(2));
      }
      else {
        $args = array($call->getParameter(0));
        $p = 3;
        if ($call->getParameter(1)->isA(DojoString)) {
          array_push($args, $call->getParameter(1), $call->getParameter(2));
        }
        else {
          array_push($args, null, $call->getParameter(1));
          $p = 2;
        }
        if ($call->getParameter($p)->isA(DojoFunctionDeclare)) {
          $init = $call->getParameter($p)->getFunction();
          array_push($args, $call->getParameter($p), $call->getParameter($p + 1));
        }
        else {
          array_push($args, null, $call->getParameter($p));
        }
      }
    }

    $name = $args[0]->getString();
    $output[$name]['type'] = 'Function';

    // $args looks like (name, null, superclass(es), initializer, mixins)      
    if ($args[2]->isA(DojoVariable)) {
      $output[$name]['chains']['prototype'][] = $args[2]->getVariable();
      $output[$name]['chains']['call'][] = $args[2]->getVariable();
    }
    elseif ($args[2]->isA(DojoArray)) {
      $items = $args[2]->getArray()->getItems();
      foreach ($items as $i => $item) {
        if ($item->isA(DojoVariable)) {
          $item = $item->getVariable();
          if (!$i) {
            $output[$name]['chains']['prototype'][] = $item;
          }
          else {
            $output[$name]['mixins']['prototype'][] = $item . '.prototype';
          }
          $output[$name]['chains']['call'][] = $item;
        }
      }
    }

    unset($init);
    if ($args[4]->isA(DojoObject)) {
      $object = $args[4]->getObject();
      $object->setName($name);
      $object->setAnonymous(true);
      $object->addBlockCommentKeySet('example');
      foreach ($object->getValues() as $key => $values) {
        foreach ($values as $value) {
          $object->addBlockCommentKey($key);
          $full_name = "$name.$key";
          if ($value->isA(DojoFunctionDeclare)) {
            if (($key == 'initializer' || $key == 'constructor')) {
              $init = $value->getFunction();
              $init->setConstructor(true);
              continue;
            }
            $function = $value->getFunction($value);
            $function->setPrototype($name);
          }
          $output[$full_name]['prototype'] = $name;
        }
      }
      $object->rollOut($output, 'Function');

      $keys = $object->getBlockCommentKeys();
      foreach ($keys as $key) {
        if ($key == 'example') {
          $output[$name]['examples'] = $object->getBlockComment('example');
        }
        elseif ($key == 'summary') {
          $output[$name]['summary'] = $object->getBlockComment('summary');
        }
        elseif ($key == 'description') {
          $output[$name]['description'] = $object->getBlockComment('description');
        }
      }
      unset($keys);
    }
    
    if ($init) {
      $init->setFunctionName($name);
      $init->rollOut($output);
    }
  }
  unset($declare_calls);
  unset($call);
  unset($init);
  unset($args);
  unset($name);
  unset($p);
  unset($items);
  unset($item);
  unset($object);
  unset($values);
  unset($key);
  unset($value);
  unset($full_name);
  unset($function);

  $inherit_calls = $package->getFunctionCalls('dojo.inherits', true);
  foreach ($inherit_calls as $call) {
    if ($call->getParameter(0)->isA(DojoVariable) && $call->getParameter(1)->isA(DojoVariable)) {
      $output[$call->getParameter(0)->getVariable()]['chains']['prototype'][] = $call->getParameter(1)->getVariable();
    }
  }
  unset($inherit_calls);
  unset($call);

  $mixin_calls = array_merge($package->getFunctionCalls('dojo.extend'), $package->getFunctionCalls('dojo.lang.extend', true), $package->getFunctionCalls('dojo.mixin'), $package->getFunctionCalls('dojo.lang.mixin'));
  $declarations = $package->getFunctionDeclarations();
  $executions = $package->getExecutedFunctions();
  $objects = $package->getObjects();

  // Since there can be chase conditions between declarations and calls, we need to find which were "swallowed" by larger blocks
  $swallowed_mixins = $package->removeSwallowed($mixin_calls);
  $package->removeSwallowed($executions);
  $package->removeSwallowed($objects);

  foreach ($objects as $object) {
    $output[$object->getName()]['type'] = 'Object';
    $object->rollOut($output);
  }
  unset($objects);
  unset($object);

  $aliases = $package->getAliases();
  unset($aliases);

  // Handle function declarations
  foreach ($declarations as $declaration) {
    $package->removeSwallowed($declaration);
    foreach ($declaration as $declaration_instance){
      $declaration_instance->removeSwallowedMixins($swallowed_mixins);
      $declaration_instance->rollOut($output);
    }
  }
  unset($declarations);
  unset($declaration);
  unset($declaration_instance);

  foreach ($executions as $execution) {
    $execution->removeSwallowedMixins($swallowed_mixins);
    $execution->rollOut($output);

    unset($execution);
  }
  $mixin_calls = array_merge($mixin_calls, $swallowed_mixins);

  unset($swallowed_mixins);
  unset($executions);

  // Handle. dojo.lang.extend and dojo.lang.mixin calls
  foreach ($mixin_calls as $call) {
    $is_prototype = false;
    if ($call->getParameter(0)->isA(DojoVariable) || $call->getParameter(0)->isA(DojoFunctionDeclare)) {
      if ($call->getParameter(0)->isA(DojoVariable)) {
        $object = $call->getParameter(0)->getVariable();
        if (strpos($object, '(') !== false) {
          continue;
        }
      }
      else {
        $function = $call->getParameter(0)->getFunction();
        $object = $function->getFunctionName();
        if (!$object) {
          $object = $call->getAssignment();
          $function->setFunctionName($object);
        }
        $function->setConstructor(true);
        $function->rollOut($output);
      }
      $call_name = $call->getName();

      if(strlen($object) > 10 && substr($object, -10) == '.prototype') {
        $is_prototype = true;
        $object = substr($object, 0, -10);
      }
      if ($call_name == 'dojo.lang.extend' || $call_name == 'dojo.extend') {
        $is_prototype = true;
      }

      $parameters = $call->getParameters();
      array_shift($parameters);
      foreach ($parameters as $parameter) {
        if ($parameter->isA(DojoObject)) {
          $properties = $parameter->getObject();
          $keys = $properties->getValues();
          foreach ($keys as $key => $functions) {
            foreach ($functions as $function) {
              $full_variable_name = "$object.$key";

              if ($is_prototype) {
                  $output[$full_variable_name]['prototype'] = $object;
              }
              if ($function->isA(DojoFunctionDeclare)) {
                $function = $function->getFunction();
                if ($is_prototype) {
                  $function->setPrototype($object);
                }
                $function->setFunctionName($full_variable_name);
                $function->rollOut($output);
              }
              elseif ($function->isA(DojoObject)) {
                $output[$full_variable_name]['type'] = 'Object';
                $obj = $function->getObject();
                $obj->setName($full_variable_name);
                $obj->rollOut($output);
              }
              else {
                if ($call_name == 'dojo.lang.mixin' || $call_name == 'dojo.mixin') {
                  if (!isset($output[$full_variable_name])) {
                    $output[$full_variable_name] = array();
                  }
                }
              }
            }
          }
        }
        elseif ($parameter->isA(DojoVariable)) {
          if ($call_name == 'dojo.lang.extend' || $call_name == 'dojo.extend') {
            $output[$object]['mixins']['prototype'][] = $parameter->getVariable();
          }
          elseif ($call_name == 'dojo.lang.mixin' || $call_name == 'dojo.mixin') {
            $output[$object]['mixins']['normal'][] = $parameter->getVariable();
          }
        }
        elseif ($parameter->isA(DojoString)) {
          print_r($call);
          throw new Exception('Odd string');
          $properties = $parameter->getString();
          // Note: inherits expects to be reading from prototype values
          if (($call_name == 'dojo.lang.extend' || $call_name == 'dojo.extend') && strpos($properties, '.prototype') !== false) {
            $output[$object]['chains']['prototype'][] = str_replace('.prototype', '', $properties);
          }
          elseif (($call_name == 'dojo.lang.extend' || $call_name == 'dojo.extend') && strpos($properties, 'new ') !== false) {
            $output[$object]['chains']['prototype'][] = str_replace('new ', '', $properties);
          }
          else {
            $output[$properties]['inherits'] = $object;
          }
        }
      }
    }
  }
  unset($mixin_calls);
  unset($call);
  unset($is_prototype);
  unset($object);
  unset($call_name);
  unset($properties);
  unset($keys);
  unset($key);
  unset($function);
  unset($variable_name);
  unset($full_variable_name);

  $external_variables = $package->getExternalVariables();
  foreach ($external_variables as $external_variable) {
    if (empty($output[$external_variable])) {
      $output[$external_variable] = array();
    }
  }

  // Remember, dojo.provides creates new objects if needed
  $parts = explode('.', $output['#provides']);
  while (count($parts)) {
      if (!array_key_exists(implode('.', $parts), $output)) {
          $output[implode('.', $parts)] = array('type' => 'Object');
      }
      array_pop($parts);
  }
  unset($parts);

  list($project,) = explode('.', $output['#provides'], 2);
  if ($output['#requires']) {
    foreach ($output['#requires'] as &$require) {
      list($require_project,) = explode('.', $require[1]);
      if ($require_project != $project) {
        $require[2] = $require_project;
      }
    }
  }

  foreach ($output as $object_name => $object) {
    if ($object_name{0} == '#') {
      continue;
    }
    $parts = explode('.', $object_name);
    $last = array_pop($parts);
    if ($last{0} == '_') {
      $output[$object_name]['private'] = true;
    }
    if (preg_match('%\._+[^A-Z]%', implode('.', $parts), $match)) {
        $output[$object_name]['private_parent'] = true;
    }
    if ($object['type'] == 'Function') {
      if (preg_match('%^(_*)[A-Z]%', $last, $match)) {
        if (strlen($match[1]) < 2) {
          unset($output[$object_name]['private']);
        }
        $output[$object_name]['classlike'] = true;
      }
      elseif ($object['prototype'] && $output[$object['prototype']]) {
        $output[$object['prototype']]['classlike'] = true;
      }
      elseif ($object['instance'] && $output[$object['instance']]) {
        $output[$object['instance']]['classlike'] = true;
      }
    }
    $output[$object_name]['summary'] = htmlentities($object['summary']);
  }

  $package->destroy();

  return $output;
}

?>
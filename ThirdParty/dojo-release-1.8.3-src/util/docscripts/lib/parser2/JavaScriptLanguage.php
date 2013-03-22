<?php

class JavaScriptLanguage {
  public static function new_token($type, $value, $extras) {
    return array('type' => $type, 'value' => $value, 'line_number' => $extras['line_number'], 'char_pos' => $extras['char_pos'], 'line' => $extras['exploded_lines'][$extras['line_number'] - 1]);
  }

  public static function tokenize($lines) {
    $lines = str_replace("\r", '', $lines);
    $tokens = array();

    $exploded_lines = explode("\n", $lines);
    $line_number = 1;
    $char_pos = 0;
    $extras = array('exploded_lines', 'line_number', 'char_pos');

    $positions = array();
    for ($i = 0; $i < strlen($lines); $i++) {
      $char = $lines{$i};

      $positions[$i] = $line_number . '|' . ++$char_pos;

      if ($char == "\n") {
        ++$line_number;
        $char_pos = 0;
      }
    }

    for ($i = 0; $i < strlen($lines); $i++) {
      $char = $lines{$i};

      list($line_number, $char_pos) = explode('|', $positions[$i], 2);

      if (count($tokens)) {
        $pop = &$tokens[count($tokens) - 1];
      }
      else {
        $pop = array('type' => '', 'value' => '');
      }

      $last_expression = array('type' => '', 'value' => '');
      // The last expression might be behind a comment
      // This is needed for stuff like regex
      for ($j = count($tokens) - 1; $j >= 0; $j--) {
        if ($tokens[$j]['type'] != 'comment') {
          $last_expression = $tokens[$j];
          break;
        }
      }

      if ($char == ' ' || $char == "\t") {
        $pop['terminated'] = true;
        continue;
      }

      switch($char){
      case '-':
      case '+':
      case '<':
      case '>':
      case '=':
      case '.':
      case '|':
      case '&':
      case ':':
        if ($char == '-' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '-') {
          $pop['value'] = '--';
          break;
        }
        elseif ($char == '+' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '+') {
          $pop['value'] = '++';
          break;
        }
        elseif ($char == '<' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '<') {
          $pop['value'] = '<<';
          break;
        }
        elseif ($char == '>' && !$pop['terminated'] && $pop['type'] == 'operator' && ($pop['value'] == '>' || $pop['value'] == '>>')) {
          $pop['value'] .= '>';
          break;
        }
        elseif ($char == '=' && !$pop['terminated'] && $pop['type'] == 'operator' && in_array($pop['value'], array('+', '-', '*', '/', '%', '<<', '>>', '>>>', '&', '^', '|', '!', '!=', '=', '==', '>', '<'))) {
          $pop['value'] .= $char;
          break;
        }
        elseif ($char == '.' && !$pop['terminated'] && $pop['type'] == 'number') {
          $pop['value'] .= $char;
          break;
        }
        elseif ($char == '|' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '|') {
          $pop['value'] = '||';
          break;
        }
        elseif ($char == '&' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '&') {
          $pop['value'] = '&&';
          break;
        }
        elseif ($case == ':' && !$pop['terminated'] && $pop['type'] == 'operator' && $pop['value'] == '?') {
          $pop['value'] = '?:';
          break;
        }
      case "\n":
      case ';':
      case ',':
      case '(':
      case ')':
      case '[':
      case ']':
      case '{':
      case '}':
      case '!':
      case '?':
      case '*':
      case '%':
      case '~':
      case '^':
        $tokens[] = self::new_token('operator', $char, compact($extras));
        break;
      case "'":
      case '"':
        $string = '';
        $last = '';
        for(++$i; $i < strlen($lines); $i++){
          $letter = $lines{$i};
          if ($last == '\\') {
            $string .= $letter;
            if ($letter == '\\') {
              // Double backslash
              $last = '';
              continue;
            }
          }
          elseif ($letter != $char) {
            $string .= $letter;
          }
          else {
            break;
          }
          $last = $letter;
        }
        $tokens[] = self::new_token('string', str_replace("\\$char", $char, $string), compact($extras));
        break;
      case '/':
        // Single-line comment, multi-line comment, regular expression, or just a division sign
        $content = $char;
        $instruction = NULL;
        $single = FALSE;
        $multi = FALSE;
        $escaped = FALSE;
        $last = '';
        $length = strlen($lines);
        for ($j = $i + 1; $j <= $length; $j++) {
          $letter = ($j == $length) ? "\n" : $lines{$j};
          if ($single) {
            if ($letter == "\n") {
              $instruction = 'comment';
              $i = $j - 1;
              break;
            }
          }
          elseif ($multi) {
            if (strlen($content) > 2 && $letter == '/' && $last == '*') {
              $content .= $letter;
              $instruction = 'comment';
              $i = $j;
              break;
            }
          }
          elseif ($last === '' && $letter == '/') {
            $single = TRUE;
          }
          elseif ($last === '' && $letter == '*') {
            $multi = TRUE;
          }
          elseif ($escaped) {
            $escaped = FALSE;
          }
          elseif ($letter == '\\') {
            $escaped = TRUE;
          }
          elseif ($last === '') {
            // If it's not a comment, it might be a regex
            // which can only occur after certain operators
            if (in_array($last_expression['value'], array(')', ']')) || ($last_expression['type'] != 'operator' && $last_expression['value'] != 'return')) {
              $content = '/';
              $instruction = 'operator';
              break;
            }
          }
          elseif ($letter == '/') {
            // When the regex ends, we need to look for modifiers
            $content .= $letter;
            $instruction = 'regex';
            $i = $j;
            for ($k = $j + 1; $k < $length; $k++) {
              $modifier = $lines{$k};
              if ($modifier == ' ' || $modifier == "\t") {
                $last = $modifier;
                continue;
              }
              elseif(in_array($modifier, array('i', 'm', 'g'))) {
                $i = $k;
                $content .= $modifier;
              }
              else {
                break;
              }
            }
            break;
          }
          elseif ($letter == "\n") {
            // End of the expression with no regex terminator
            // So it's a division sign
            $content = '/';
            $instruction = 'operator';
            break;
          }

          $content .= $letter;
          $last = $letter;
        }

        $tokens[] = self::new_token($instruction, $content, compact($extras));
        break;
      default:
        if ($pop['type'] != 'name' && is_numeric($char)) {
          if ($pop['value'] == '.' || $pop['type'] == 'number') {
            $pop['type'] = 'number';
            $pop['value'] .= $char;
          }
          else {
            $tokens[] = self::new_token('number', $char, compact($extras));
          }
        }
        else {
          if (!$pop['terminated'] && $pop['type'] == 'name') {
            $pop['value'] .= $char;
          }
          elseif ($pop['type'] == 'number' && strtolower(substr($pop['value'], 0, 2)) == '0x' && stripos('1234567890abcdef', $char) !== false) {
            // Hex
            $pop['value'] .= $char;
          }
          elseif (strtolower($char) == 'x' && $pop['value'] == '0') {
            // Hex
            $pop['value'] .= $char;
          }
          elseif (strtolower($char) == 'e' && $pop['type'] == 'number') {
            // e-notation
            $pop['value'] .= $char;
          }
          else {
            $tokens[] = self::new_token('name', $char, compact($extras));
          }
        }
      }
    }

    // print '<pre>';
    // print_r($tokens);
    // print '</pre>';
    // die();

    return $tokens;
  }
}
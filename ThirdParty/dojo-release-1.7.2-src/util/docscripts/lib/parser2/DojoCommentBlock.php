<?php

class DojoCommentBlock {
  public static $prefix = '';
  public static $suffix = ':';

  protected $blocks;

  protected $comments;
  protected $keys = array();
  protected $key_sets = array();

  public function __construct($comments, $keys, $key_sets = array()) {
    if (!is_array($comments)) {
      throw new Exception('DojoCommentBlock expects an array of comments to be passed');
    }
    $this->comments = $comments;
    $this->keys = $keys;
    $this->key_sets = $key_sets;
  }

  public function __destruct() {
    unset($this->blocks);
    unset($this->comments);
    unset($this->keys);
    unset($this->key_sets);
  }

  public function add_key($key) {
    unset($this->blocks);
    $this->keys[] = $key;
  }

  public function return_type() {
    // TODO: Add return type(s)
  }

  public function get($key) {
    $comments = $this->all();
    return $comments[$key] ? $comments[$key] : '';
  }

  public function all() {
    if (isset($this->blocks)) {
      return $this->blocks;
    }

    $expression = '%^' . self::$prefix . '(' . implode('|', array_merge($this->keys, $this->key_sets)) . ')' . self::$suffix . '\W*%';

    $blocks = array();
    $buffer = array();
    $key = NULL;
    foreach ($this->comments as $comment) {
      if (empty($comment) && $key) {
        $this->swallow($blocks, $key, $buffer);
      }

      $comment = preg_replace('%(^//\s*|^/\*\s*|\s*\*/$)%', '', $comment);
      foreach (explode("\n", $comment) as $line) {
        if (preg_match($expression, $line, $match)) {
          if ($key && !empty($buffer)) {
            $this->swallow($blocks, $key, $buffer);
          }
          $line = substr($line, strlen($match[0]));
          $key = $match[1];
        }

        $line = trim($line);
        if ($line && $line{0} == '|') {
          $line = substr($line, 1);
        }

        if ($key) {
          $buffer[] = $line;
        }
      }
    }

    if ($key && !empty($buffer)) {
      $this->swallow($blocks, $key, $buffer);
    }

    return ($this->blocks = $blocks);
  }

  private function swallow(&$blocks, &$key, &$lines) {
    $lines = preg_replace('%(^\n+|\n+$)%', '', implode("\n", $lines));
    if (in_array($key, $this->keys)) {
      $blocks[$key] = $lines;
    }
    else {
      $blocks[$key][] = $lines;
    }

    $key = NULL;
    $lines = array();
  }
}
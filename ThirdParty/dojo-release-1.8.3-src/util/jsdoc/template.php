<?php

// Use this theme function to do a final manipulation of the form

function phptemplate_jsdoc_object_form($form) {
}

function phptemplate_jsdoc_object_form($form) {
}

// Use these functions to create the equivalent tpl.php files

// function theme_jsdoc_object_children($children) {
function phptemplate_jsdoc_object_children($children) {
  return _phptemplate_callback('jsdoc_object_children', array('children' => $children));
}
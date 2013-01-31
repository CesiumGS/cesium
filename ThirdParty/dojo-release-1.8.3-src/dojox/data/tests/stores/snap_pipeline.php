<?php

$field_names = array('"empno"', '"ename"', '"job"', '"hiredate"', '"sal"', '"comm"', '"deptno"');

$rows = array(array("7369", '"SMITH,CLERK"', "7902", '"1993-06-13"', "800.00", "0.00", "20"),
              array("7499", '"ALLEN,SALESMAN"', "7698", '"1998-08-15"', "1600.00", "300.00", "30"),
              array("7521", '"WARD,SALESMAN"', "7698", '"1996-03-26"', "1250.00", "500.00", "30"),
              array("7566", '"JONES,MANAGER"', "7839", '"1995-10-31"', "2975.00", '""', "20"),
              array("7698", '"BLAKE,MANAGER"', "7839", '"1992-06-11"', "2850.00", '""', "30"),
              array("7782", '"CLARK,MANAGER"', "7839", '"1993-05-14"', "2450.00", '""', "10"),
              array("7788", '"SCOTT,ANALYST"', "7566", '"1996-03-05"', "3000.00", '""', "20"),
              array("7839", '"KING,PRESIDENT"', '"1990-06-09"', "5000", "1100.0", '""', "0.00", "10"),
              array("7844", '"TURNER,SALESMAN"', "7698", '"1995-06-04"', "1500.00", '""', "0.00", "30"),
              array("7876", '"ADAMS,CLERK"', "7788", '"1999-06-04"', "1100.00", '""', "20"),
              array("7900", '"JAMES,CLERK"', "7698", '"2000-06-23"', "950.00", '""', "30"),
              array("7934", '"MILLER,CLERK"', "7782", '"2000-01-21"', "1300.00", '""', "10"),
              array("7902", '"FORD,ANALYST"', "7566", '"1997-12-05"', "3000.00", '""', "20"),
              array("7654", '"MARTIN,SALESMAN"', "7698", '"1998-12-05"', "1250.00", "1400.00", "30"));

$prefix = htmlentities($_GET["sn_stream_header"]);

if(@$_GET["sn_count"]) {
    if($_GET["sn_count"] == "records"){
        echo $prefix . "([[" . count($rows) . "]])";
    } else {
        header("HTTP/1.1 400 Bad Request");
        echo "sn.count parameter, if present, must be set to 'records'.";
        exit(0);
    }
} else {
    if(@$_GET["sn_start"]) {
        $start = $_GET["sn_start"];
    } else {
        $start = 1;
    }

    if(@$_GET["sn_limit"]) {
        $limit = $_GET["sn_limit"];
    } else {
        $limit = count($rows);
    }

    if(!is_numeric($start) || !is_numeric($limit)) {
        header("HTTP/1.1 400 Bad Request");
        echo "sn.start or sn.limit specified a non-integer value";
        exit(0);
    }

    $start -= 1;

    if($start < 0 || $start >= count($rows) || $limit < 0) {
        header("HTTP/1.1 400 Bad Request");
        echo "sn.start and/or sn.limit out of range";
        exit(0);
    }

    $slice = array_slice($rows, $start, $limit);

    header("Content-type: application/javascript");
    echo $prefix . "([";

    $out_rows = array("[" . join(", ", $field_names) . "]");
    foreach($slice as $r) {
        $out_rows[] = "[" . join(", ", $r) . "]";
    }
    
    echo join(", ", $out_rows);
    echo "])";
 }

?>


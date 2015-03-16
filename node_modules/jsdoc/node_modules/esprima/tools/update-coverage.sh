#!/bin/bash

if [ `command -v istanbul` ]; then

    REVISION=`git log -1 --pretty=%h`
    DATE=`git log -1 --pretty=%cD | cut -c 6-16`

    echo "Running coverage analysis..."
    istanbul cover test/runner.js
    grep -v 'class="path' coverage/lcov-report/esprima/esprima.js.html | grep -v "class='meta" > test/esprima.js.html

else
    echo "Please install Istanbul first!"
fi

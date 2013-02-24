#!/bin/bash

# only run this in a pristine export of an svn tag.
# It should only be run on unix, more specifically, where sha1sum is available.

#version should be something like 0.9.0beta or 0.9.0, should match the name of the svn export.
version=$1

if [ -z $version ]; then
    echo "Please pass in a version number"
    exit 1
fi

dobuild() {
	./build.sh profile=standard profile=cdn releaseName=$1 cssOptimize=comments.keepLines optimize=closure layerOptimize=closure stripConsole=normal version=$1 copyTests=false mini=true action=release
	mv ../../release/$1 ../../release/$1-cdn
	cd ../../release/$1-cdn
	zip -rq $1.zip $1/*
	sha1sum $1.zip > sha1.txt
	cd $1
	find . -type f -exec sha1sum {} >> ../sha1.txt \;
}

# Generate locale info
cd cldr
ant clean  # necessary until cldr scripts can handle existing AMD files
ant
cd ..

# Setup release area
mkdir -p ../../release/$version-cdn

# Google build
dobuild $version

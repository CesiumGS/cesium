#!/bin/bash

#version should be something like 0.9.0beta or 0.9.0
name=$1
#The svn revision number to use for tag. Should be a number, like 11203
svnRevision=$2

#If no svnRevision number, get the latest one from he repo.
if [ "$svnRevision" = "" ]; then
    svnRevision=`svn info http://svn.dojotoolkit.org/src/util/trunk/buildscripts/build_release.sh | grep Revision | sed 's/Revision: //'`
fi

svn mkdir -m "Using r$svnRevision to create a branch named $name." https://svn.dojotoolkit.org/src/branches/$name
svn copy -r $svnRevision https://svn.dojotoolkit.org/src/dojo/trunk  https://svn.dojotoolkit.org/src/branches/$name/dojo -m "Using r$svnRevision to create a branch named $name."
svn copy -r $svnRevision https://svn.dojotoolkit.org/src/dijit/trunk https://svn.dojotoolkit.org/src/branches/$name/dijit -m "Using r$svnRevision to create a branch named $name."
svn copy -r $svnRevision https://svn.dojotoolkit.org/src/dojox/trunk https://svn.dojotoolkit.org/src/branches/$name/dojox -m "Using r$svnRevision to create a branch named $name."
svn copy -r $svnRevision https://svn.dojotoolkit.org/src/util/trunk  https://svn.dojotoolkit.org/src/branches/$name/util -m "Using r$svnRevision to create a branch named $name."
svn copy -r $svnRevision https://svn.dojotoolkit.org/src/demos/trunk https://svn.dojotoolkit.org/src/branches/$name/demos -m "Using r$svnRevision to create a branch named $name."


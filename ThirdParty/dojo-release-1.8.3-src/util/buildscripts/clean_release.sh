#!/bin/bash
#
#	After the build completes, you can run this script to remove all unnecessary cruft.
#
#   WARNING: There are a lot of 'rm -f' commands in here, mostly checked, but know:
#	Use at your own risk! 
#
#	NOTE: This is a fairly difinitive example of what is not needed (except in testing) ...

releaseDir=$1;
if [ "$releaseDir" = "" ]; then
	releaseDir = ../../release
fi

buildName=$2;
if [ "$buildName" = "" ]; then
	buildName = dojo
fi

rm_dojo_files ()
{
	for d in "$@"
	do
		if [ -e "$buildName/$d" ]; then
			# echo "Removing: $d";
			rm -rf "$buildName/$d"
		fi
	done
}

# FIXME: refs #6616 - could be able to set a global copyright file and null out build_release.txt
#mv build_notice.txt _build_notice.txt
#touch build_notice.txt

if [ -d $releaseDir ]; then

	cd $releaseDir

	# remove dojox tests and demos - they all follow this convention
	for i in $buildName/dojox/* 
	do
	  if [ -d $i ]; then
	    rm -rf $i/tests/
	    rm -rf $i/demos/ 
	  fi
	done
	
	# removed dijit tests
	rm_dojo_files "dijit/tests" "dijit/demos" "dijit/bench" "dojo/tests" "dojo/tests.js" "util"

	# cleanup dijit/themes/ selectively
	if [ -d $buildName/dijit/themes ]; then

		# noir isn't worth including yet		
		if [ -d $buildName/dijit/themes/noir ]; then
			rm -rf $buildName/dijit/themes/noir/
		fi
		
		# so the themes are there, lets assume that, piggyback on noir: FIXME later
		find ./$buildName/dijit/themes/ -name *.html -exec rm '{}' ';'

		# remove themeTester from minified build. 
		rm -f $buildName/dijit/themes/templateThemeTest.html
		rm -f $buildName/dijit/themes/themeTester*.html
		rm -rf $buildName/dijit/themes/themeTesterImages/	

	fi

	# remove uncompressed .js files (leave for official release)
	# find . -name *.uncompressed.js -exec rm '{}' ';'

	# WARNING: templates have been inlined into the .js -- if you are using dynamic templates,
	# or other build trickery, these lines might not work!
	rm_dojo_files "dijit/templates" "dijit/form/templates" "dijit/layout/templates"

	# NOTE: we're not doing this in DojoX because the resources/ folder (to me) is deemed
	# ambigious, and should be treated on a per-project basis

	# NOTE: if you aren't using anything in DojoX, uncomment this line:
	# rm -rf dojo/dojox/
	# OR get creative and only populate dojox/ folder with the projects you need, and leave alone.
	# .. assume you didn't, and clean up all the README's (leaving LICENSE, mind you)
	# find ./$buildName/dojox/ -name README -exec rm '{}' ';'
	
	# WARNING: if you care about _base existing (and not _always_ just dojo.js providing it) then comment this line:
	# rm_dojo_files "dojo/_base" "dojo/_base.js"

	# NOTE: we're not doing the above to dijit/_base/ because I secretly use dijit/_base functions
	# when only using dojo.js (place.js and sniff.js in particular), and mini would break stuff ...

	# last but not least
	# rm_dojo_files "dojo/build.txt"
	
	cd ../util/buildscripts/

fi

# cleanup from above, refs #6616
#mv _build_notice.txt build_notice.txt

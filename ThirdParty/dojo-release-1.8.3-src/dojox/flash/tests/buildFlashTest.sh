#!/bin/sh
# TODO: FIXME: Get rid of this and hook it into Dojo's general build script
# You must have mtasc to run this
mtasc -trace DojoExternalInterface.trace -main -cp .. -swf TestFlash.swf -version 8 -header 215:138:10 TestFlash.as
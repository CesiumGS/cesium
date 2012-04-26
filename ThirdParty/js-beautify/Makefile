
define AVAILABLE_ACTIONS

publish:	publish jsbeautifier to github.com and sync
test:		test both implementations, js and python
testp:		test python implementation
testj:		test javascript implementation

endef
export AVAILABLE_ACTIONS


define SCRIPT_PUBLISH

open spic
cd jsbeautifier.org
mirror -Rv attic
mirror -Rv jquery
mirror -Rv tests
mirror -Rv unpackers
mirror -Rv python
put beautify-html.js beautify.js index.html license.txt README.md

endef
export SCRIPT_PUBLISH


.SILENT:

all:
	echo "$$AVAILABLE_ACTIONS"

publish:
	git push
	lftp -c "$$SCRIPT_PUBLISH"

testp:
	echo Testing python implementation...
	cd python ;\
	./test-jsbeautifier.py
	echo

testj:
	echo Testing javascript implementation...
	./tests/run-tests
	echo

tests: testp testj

test: testp testj


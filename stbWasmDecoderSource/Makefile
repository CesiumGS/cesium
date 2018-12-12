all: stbi_decode.js

SRCS= decode.c

stbi_decode.js: $(SRCS) Makefile
	emcc -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 \
		--memory-init-file 0 \
		-s MODULARIZE=1 \
		-s EXPORT_NAME=\"'StbDecoderModule'\"\
		-s EXPORTED_FUNCTIONS="['_decode']" \
		-o stbi_decode.js $(SRCS)

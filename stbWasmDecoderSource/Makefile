all: stbi_decode.js

SRCS= decode.c

# Using O3 and above requires exporting _malloc/_free OR writing functions that pass these through.
# This turns out to be slower than just O2 on in my testing on
# Chrome 71.0.3578.98 (Official Build) (64-bit) on Windows 10 and Ubuntu 18.04.1.
# Performance may be slightly better in Firefox overall and better for O3 than for O2.

# Built with the following build environment:
# $ emcc -v
# emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 1.38.21
# clang version 6.0.1  (emscripten 1.38.21 : 1.38.21)
# Target: x86_64-unknown-linux-gnu
# Thread model: posix
# InstalledDir: /mnt/c/Source/emsdk/emsdk-1.35.0-portable-64bit/clang/e1.38.21_64bit
# Found candidate GCC installation: /usr/lib/gcc/x86_64-linux-gnu/7
# Found candidate GCC installation: /usr/lib/gcc/x86_64-linux-gnu/7.3.0
# Found candidate GCC installation: /usr/lib/gcc/x86_64-linux-gnu/8
# Selected GCC installation: /usr/lib/gcc/x86_64-linux-gnu/7.3.0
# Candidate multilib: .;@m64
# Selected multilib: .;@m64
# shared:INFO: (Emscripten: Running sanity checks)
# shared:WARNING: java does not seem to exist, required for closure compiler, which is optional (define JAVA in /home/kli/.emscripten if you want it)
# shared:WARNING: closure compiler will not be available

stbi_decode.js: $(SRCS) Makefile
	emcc -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 \
		--memory-init-file 0 \
		-s MODULARIZE=1 \
		-s EXPORT_NAME=\"'StbDecoderModule'\"\
		-s EXPORTED_FUNCTIONS="['_decode']" \
		-o stbi_decode.js $(SRCS) \
		-O2

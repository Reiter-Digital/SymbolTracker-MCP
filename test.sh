#!/bin/sh
echo '{"tool":"get_doc_for_file","input":{"file":"src/test-sample.ts"}}' | node dist/index.js

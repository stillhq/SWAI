#!/bin/bash
SWAI_PATH=$(dirname $(realpath $0))

"$SWAI_PATH/node_modules/.bin/electron" "$SWAI_PATH/index.js" "$@"
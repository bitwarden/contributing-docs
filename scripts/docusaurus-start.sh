#!/usr/bin/env bash

ROOT_DIR=$(git rev-parse --show-toplevel)

# shellcheck source=.env
set -o allexport
source $ROOT_DIR/.env
set +o allexport

npm run docusaurus start

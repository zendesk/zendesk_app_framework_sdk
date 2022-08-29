#!/bin/sh
set -euo pipefail
IFS=' ' read -r allowed <<< "native-promise-only zendesk_app_framework_sdk"
dependencies=$(npm ls --production --depth=0 --parseable | awk '{gsub(/\/.*\//,"",$1); print}')

for dep in $dependencies; do
  if [[ ! ${allowed[*]} =~ (^|[[:space:]])"$dep"($|[[:space:]]) ]]; then
    echo "::error ZAP SDK does not allow external dependencies, please remove \"${dep}\" dependency from package.json"
    exit 1
  fi
done

# for dep in $dependencies; do
#   found="" 
#   for allow in $allowed[@]; do
#     if [[ ${allow} == ${dep} ]]; then
#       found=$allow
#       continue
#     fi
#   done
#   if [[ -z "$found" ]]; then
#     echo "::error ZAP SDK does not allow external dependencies, please remove \"${dep}\" dependency from package.json"
#     exit 1
#   fi
# done


# for dep in $dependencies; do
#   found="" 
#   for allow in $allowed[@]; do if [[ ${allow} == ${dep} ]]; then found=$allow continue fi done
#   if [[ -z "$found" ]]; then
#     echo "::error ZAP SDK does not allow external dependencies, please remove \"${dep}\" dependency from package.json"
#     exit 1
#   fi
# done
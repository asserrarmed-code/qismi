#!/bin/bash

echo "Checking if Vercel should build..."
echo "Current branch (VERCEL_GIT_COMMIT_REF): $VERCEL_GIT_COMMIT_REF"

if [ "$VERCEL_GIT_COMMIT_REF" = "gh-pages" ]; then
  echo "✅ This is the 'gh-pages' branch containing pre-built static assets. Ignoring build to prevent errors."
  exit 0
else
  echo "🚀 This is a source branch ($VERCEL_GIT_COMMIT_REF). Proceeding with Vercel build."
  exit 1
fi

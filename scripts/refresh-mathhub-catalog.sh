#!/usr/bin/env bash
set -euo pipefail

# Refresh the local MathHub catalog from the published compressed catalog.
CATALOG_URL="https://mathhub.info/pkg/catalog.json.gz"

# Resolve the repository root from this script's location so the script can be
# run from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_CATALOG="$REPO_ROOT/catalog.json"

# Create an isolated temporary workspace for the download and extracted file.
TMP_DIR="$(mktemp -d)"
DOWNLOADED_GZIP="$TMP_DIR/catalog.json.gz"
EXTRACTED_CATALOG="$TMP_DIR/catalog.json"

cleanup() {
  # Remove all temporary files created during the refresh attempt.
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

echo "==> Refreshing MathHub catalog..."
echo "==> Repository root: $REPO_ROOT"

# Confirm the repository already has the target catalog before replacing it.
if [[ ! -f "$TARGET_CATALOG" ]]; then
  fail "Target catalog is missing: $TARGET_CATALOG"
fi

# Download the compressed catalog and fail clearly for HTTP or network errors.
echo "==> Downloading catalog from $CATALOG_URL..."
if ! curl -fL --retry 3 --connect-timeout 15 --output "$DOWNLOADED_GZIP" "$CATALOG_URL"; then
  fail "Failed to download catalog from $CATALOG_URL"
fi

# Validate the gzip file before attempting to extract it.
echo "==> Validating downloaded gzip file..."
if ! gzip -t "$DOWNLOADED_GZIP"; then
  fail "Downloaded file is not a valid gzip archive: $DOWNLOADED_GZIP"
fi

# Extract the gzip into the temporary workspace.
echo "==> Extracting catalog..."
if ! gunzip -c "$DOWNLOADED_GZIP" > "$EXTRACTED_CATALOG"; then
  fail "Failed to extract catalog from gzip archive"
fi

# Ensure extraction produced a non-empty file before replacing the catalog.
if [[ ! -s "$EXTRACTED_CATALOG" ]]; then
  fail "Extracted catalog is empty: $EXTRACTED_CATALOG"
fi

# Replace the repository catalog only after download and extraction succeeded.
echo "==> Replacing local catalog at $TARGET_CATALOG..."
mv "$EXTRACTED_CATALOG" "$TARGET_CATALOG"

echo "==> Cleaning up temporary files..."
cleanup
trap - EXIT

echo "==> MathHub catalog refresh complete."

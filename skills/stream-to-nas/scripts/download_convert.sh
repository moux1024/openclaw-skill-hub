#!/bin/bash
# scripts/download_convert.sh
set -e

M3U8_URL=$1
FILENAME=$2

if [ -z "$M3U8_URL" ]; then
  echo "Usage: bash download_convert.sh <m3u8_url> [filename]"
  exit 1
fi

OUT=${FILENAME:-output_$(date +%s).mp4}

ffmpeg -y -loglevel error \
  -i "$M3U8_URL" \
  -c copy -bsf:a aac_adtstoasc \
  "/tmp/$OUT"

if [ ! -f "/tmp/$OUT" ]; then
  echo "DOWNLOAD_FAILED"
  exit 1
fi

echo "/tmp/$OUT"

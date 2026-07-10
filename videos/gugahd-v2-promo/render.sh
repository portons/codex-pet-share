#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$ROOT/.tmp/gugahd-promo"
SOURCE="$WORK/source"
FRAMES="$WORK/frames"
OUT="$ROOT/videos/gugahd-v2-promo/codex-pets-v2-gugahd-x.mp4"
FONT="/System/Library/Fonts/SFNSMono.ttf"
SPRITESHEET_URL="https://codex-pets.net/assets/pets/v/1783670632175/gugahd/spritesheet.webp"

mkdir -p "$SOURCE" "$FRAMES"

curl -fsS --max-time 30 "$SPRITESHEET_URL" -o "$SOURCE/spritesheet.webp"

for direction in $(seq 0 15); do
  row=$((9 + direction / 8))
  column=$((direction % 8))
  ffmpeg -y -hide_banner -loglevel error \
    -i "$SOURCE/spritesheet.webp" \
    -vf "crop=192:208:$((column * 192)):$((row * 208)),format=rgba" \
    "$FRAMES/look-$(printf '%02d' "$direction").png"
done

ffmpeg -y -hide_banner -loglevel warning \
  -f lavfi -i "gradients=s=1080x1080:r=30:d=5.5:c0=0x080a07:c1=0x1c2912:x0=0:y0=0:x1=1080:y1=1080:type=radial:speed=0.02" \
  -framerate 8 -stream_loop -1 -i "$FRAMES/look-%02d.png" \
  -loop 1 -i "$ROOT/public/assets/petshare-logo-nav.webp" \
  -filter_complex "
    [0:v]format=rgba,
      drawgrid=w=60:h=60:t=1:c=0x9fcb61@0.045,
      drawbox=x=36:y=36:w=1008:h=1008:color=0x090c08@0.60:t=fill,
      drawbox=x=36:y=36:w=1008:h=1008:color=0x9fcb61@0.25:t=3,
      drawbox=x=210:y=285:w=660:h=560:color=0x111810@0.88:t=fill,
      drawbox=x=210:y=285:w=660:h=560:color=0x9fcb61@0.28:t=2[base];
    [2:v]scale=72:72:flags=neighbor,format=rgba[logo];
    [base][logo]overlay=x=70:y=62:format=auto[branded];
    [1:v]scale=480:520:flags=neighbor,format=rgba[pet];
    [branded][pet]overlay=x=(W-w)/2:y=316+8*sin(2*PI*t/1.3):format=auto[staged];
    [staged]
      drawtext=fontfile='$FONT':text='CODEX PETS':fontcolor=0xeff5e7:fontsize=34:x=160:y=72,
      drawtext=fontfile='$FONT':text='NEW · V2':fontcolor=0x9fcb61:fontsize=22:x=160:y=112,
      drawtext=fontfile='$FONT':text='V2 PETS LOOK AROUND':fontcolor=0xf4f7ef:fontsize=58:x=(w-text_w)/2:y=174,
      drawtext=fontfile='$FONT':text='16 directions. One tiny legend.':fontcolor=0xb8c4ad:fontsize=29:x=(w-text_w)/2:y=246,
      drawtext=fontfile='$FONT':text='GUGAHD · V2':fontcolor=0x9fcb61:fontsize=22:x=244:y=312,
      drawtext=fontfile='$FONT':text='MEET GUGAHD':fontcolor=0xf4f7ef:fontsize=42:x=(w-text_w)/2:y=888,
      drawtext=fontfile='$FONT':text='codex-pets.net':fontcolor=0x9fcb61:fontsize=31:x=(w-text_w)/2:y=949,
      fade=t=in:st=0:d=0.35,
      fade=t=out:st=5.0:d=0.5,
      format=yuv420p[outv]
  " \
  -map "[outv]" \
  -t 5.5 -r 30 -an \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"

echo "$OUT"

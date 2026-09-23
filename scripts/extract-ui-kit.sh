#!/usr/bin/env bash
# Cuts the Art Nouveau UI kit sheet (1448x1086) into the assets used by the nouveau skin.
# Usage: scripts/extract-ui-kit.sh path/to/ui-kit.webp [path/to/reference-screen.webp]
# The optional 1536x1024 reference screen supplies the full-height portrait strip.
set -euo pipefail

KIT=${1:?usage: extract-ui-kit.sh <ui-kit image> [reference screen]}
SCREEN=${2:-}
OUT="$(dirname "$0")/../src/assets/nouveau"
mkdir -p "$OUT"

# Plain crop.
crop() { magick "$KIT" -crop "$2" +repage "$OUT/$1.webp"; }

# Crop, then clear the parchment background by flood-filling from the four corners.
flood() {
  magick "$KIT" -crop "$2" +repage -alpha set -fuzz "${3:-10}%" -fill none \
    -draw 'color 0,0 floodfill' -draw 'color %[fx:w-1],0 floodfill' \
    -draw 'color 0,%[fx:h-1] floodfill' -draw 'color %[fx:w-1],%[fx:h-1] floodfill' \
    -trim +repage -filter Lanczos -resize 200% -quality 88 "$OUT/$1.webp"
}

# Crop a pointy-top hex tile and mask everything outside the hexagon.
hex() {
  magick "$KIT" -crop "$2" +repage -filter Lanczos -resize 200% \
    \( +clone -alpha extract -fill black -colorize 100 -fill white \
       -draw 'polygon %[fx:w/2],1 %[fx:w-2],%[fx:h/4] %[fx:w-2],%[fx:3*h/4] %[fx:w/2],%[fx:h-2] 1,%[fx:3*h/4] 1,%[fx:h/4]' \) \
    -alpha off -compose CopyOpacity -composite -quality 88 "$OUT/$1.webp"
}

# World Overview card with its contents painted over, leaving an empty ornate frame for border-image.
frame() {
  magick "$KIT" -crop 252x263+1176+321 +repage -fill 'rgb(238,228,204)' \
    -draw 'rectangle 30,10 190,30' -draw 'rectangle 14,30 240,255' \
    -alpha set -fuzz 6% -fill none \
    -draw 'color 0,0 floodfill' -draw 'color %[fx:w-1],0 floodfill' \
    -draw 'color 0,%[fx:h-1] floodfill' -draw 'color %[fx:w-1],%[fx:h-1] floodfill' \
    -filter Lanczos -resize 200% -quality 88 "$OUT/$1.webp"
}

# Light line icon on dark green -> white glyph whose alpha is its brightness (used as a CSS mask).
glyph() {
  magick "$KIT" -crop "$2" +repage -colorspace Gray -level 45%,90% -background white -alpha shape \
    -trim +repage -filter Lanczos -resize 200% -quality 88 "$OUT/$1.webp"
}

crop scenario 80x84+908+678
frame card-frame
flood logo 248x120+20+162 3
flood seasons 327x100+293+162
flood btn-journal 74x74+649+175
flood btn-settings 74x74+729+175
flood btn-map 74x74+809+175
flood compass 202x170+456+602
flood dock-left 267x88+18+884 6
flood dock-right 312x88+1120+884 6
flood divider 307x30+405+1016

hex hex-forest 78x92+918+163
hex hex-water 78x92+1002+163
hex hex-grassland 78x92+1172+163
hex hex-savanna 78x92+1256+163
hex hex-degraded 78x92+1340+163

# Colour icons from the game icon set (row 20) and panels.
for spec in vitality:764 moisture:821 pollution:879 temperature:939 diversity:999 plants:1050 \
            birds:1117 pollinators:1185 settings:1256 journal:1325 leaf:1387; do
  flood "icon-${spec%%:*}" "44x38+$(( ${spec##*:} - 22 ))+1002" 12
done
flood icon-species 30x30+464+524 12
flood icon-observe 32x26+265+390 12
flood icon-hypothesize 28x30+270+462 12
flood icon-test 28x30+270+540 12
flood icon-restore 33x32+727+458 12
flood icon-clean 34x32+780+458 12
flood icon-modify 37x32+835+458 12

# Dock glyphs (drawn light on the green dock).
glyph glyph-goals 36x36+416+900
glyph glyph-species 34x34+523+903
glyph glyph-climate 38x36+623+900
glyph glyph-hydrology 30x34+734+902
glyph glyph-interactions 36x34+833+902
glyph glyph-events 38x32+936+903
glyph glyph-settings 34x34+1043+902

if [[ -n "$SCREEN" ]]; then
  magick "$SCREEN" -crop 140x900+0+0 +repage "$OUT/portrait-strip.webp"
fi

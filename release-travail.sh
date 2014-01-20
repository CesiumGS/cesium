# Copy across to travail dir
SRC=./Build/Cesium
DST=../travail-2/app/assets/javascripts/.
echo Copying files to $DST
cp -R $SRC/Cesium.js $SRC/Assets $SRC/Workers $DST


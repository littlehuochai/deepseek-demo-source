#!/bin/sh
# 打 APK：把 chat-demo-mobile/dist 打进安装包，签名用同目录的 dsh.keystore
set -e
JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-arm64}
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
BT=${BT:-/opt/android/android-14}
AJ=${AJ:-/opt/android/android-34/android.jar}
Q=${Q:-/usr/bin/qemu-x86_64-static}   # arm64 主机上用 qemu 跑 x86_64 的 aapt2
DIST=${1:-/root/workspace/chat-demo-mobile/dist}

[ -d "$DIST" ] || { echo "找不到构建产物：$DIST"; exit 1; }
cd "$(dirname "$0")"
rm -rf assets build && mkdir -p assets build/classes build/dex
cp -r "$DIST"/. assets/

"$Q" "$BT/aapt2" compile --dir res -o build/res.zip
"$Q" "$BT/aapt2" link -o build/base.apk -I "$AJ" --manifest AndroidManifest.xml \
  -R build/res.zip --auto-add-overlay -A assets --min-sdk-version 24 --target-sdk-version 34
javac -source 8 -target 8 -bootclasspath "$AJ" -classpath "$AJ" \
  -d build/classes java/app/dsh/deepseekdemo/MainActivity.java 2>&1 | grep -v "^Note" || true
"$BT/d8" --release --lib "$AJ" --min-api 24 --output build/dex $(find build/classes -name "*.class")

python3 - <<'PY'
import zipfile
with zipfile.ZipFile('build/base.apk') as zin, zipfile.ZipFile('build/with-dex.apk','w',zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        zout.writestr(item, zin.read(item.filename))
    zout.write('build/dex/classes.dex','classes.dex')
PY

"$Q" "$BT/zipalign" -f 4 build/with-dex.apk build/aligned.apk
"$BT/apksigner" sign --ks dsh.keystore --ks-pass pass:dshdemo123 --key-pass pass:dshdemo123 \
  --out build/DeepSeekDemo.apk build/aligned.apk
echo "完成：$(pwd)/build/DeepSeekDemo.apk"

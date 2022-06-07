IFS=$'\n'

if [[ "$NPM_PKG" == "" ]]; then
  echo "\$NPM_PKG is not specified"
  exit
fi

if [[ "$*" == "" ]]; then
  echo "file list empty"
  exit
fi

tmp=$(mktemp -d)

for src in $*; do
  hash=$(openssl dgst -sha256 -binary $src | openssl base64 -A)
  key=$(sed 's/[^a-zA-Z0-9]//g' <<< $hash | head -c 16)

  ver=0.0.0-$key
  pkg=$NPM_PKG@$ver
  dst=$pkg/index.js

  echo "upload: $src ($hash)"

  list="$list
$hash https://unpkg.com/$dst
$hash https://cdn.jsdelivr.net/npm/$dst
"
  str=$(npm view $pkg name)
  if [[ $str == $NPM_PKG ]]; then
    echo "file existed: https://unpkg.com/$dst"
    continue
  fi

  rm -f $tmp/*
  cp $src $tmp/index.js

  echo '{"name":"'$NPM_PKG'","version":"'$ver'"}' > $tmp/package.json
  npm publish $tmp --quiet

  echo "uploaded: https://unpkg.com/$dst"
done

rm -rf $tmp

freecdn db --import <<< "$list"
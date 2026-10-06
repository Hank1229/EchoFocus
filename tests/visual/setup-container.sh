#!/bin/sh
# Shared by docker.sh and the CI job: the same fonts and dependencies in the
# same image. Inter and Noto Sans TC head the product's font stack. Noto Sans
# TC is the variable font (every weight) from a pinned google/fonts commit;
# the distro's CJK package has only regular and bold under another family
# name, so zh-TW headings fell back to a thin face.
set -e

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fonts-inter >/dev/null

FONT_URL='https://raw.githubusercontent.com/google/fonts/3be1884c48c3e45b52ecc725676a08f87776373e/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf'
FONT_SHA256='864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f'
mkdir -p /usr/local/share/fonts/noto-sans-tc
curl -fsSL -o /usr/local/share/fonts/noto-sans-tc/NotoSansTC.ttf "$FONT_URL"
echo "$FONT_SHA256  /usr/local/share/fonts/noto-sans-tc/NotoSansTC.ttf" | sha256sum -c - >/dev/null
fc-cache -f >/dev/null

npm install -g pnpm@10.30.1 >/dev/null 2>&1
pnpm config set store-dir /pnpm-store
pnpm install --frozen-lockfile

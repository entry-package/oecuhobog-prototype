# 大阪電気通信大学高等学校同窓会 新デザイン確認サイト

確認URL: https://entry-package.github.io/oecuhobog-prototype/

公開記事88件・既存コメント6件を含む新デザインです。現行本番は https://www.oecuhobog.org/ です。
確認サイトでは全175フォームの入力・送信を停止し、アクセス解析を読み込みません。検索除外を維持します。

## 公開前修正
2026-10-18: 旧ドメイン・終了済み申込・閲覧不能資料のリンクを整理し、2023年度フォームを受付終了の案内へ変更。
学校公式ニュース・寄付の説明・証明書案内・会報紹介・情報取扱いの説明を更新。狭い画面の文章のはみ出しを修正。
資料本文と写真は保持し、利用できないリンクは本文に理由を添えています。
2027年度総会は5月15日（土）夕方、募集は3月開始予定。会場・詳細時刻は未定です。

## 本番成果物の準備
Python 3 + Beautiful Soup 4 を使用します。作業は運用用Mac miniで行います。

```sh
python tools/capture_live.py ../live-snapshot
python tools/build_production.py --snapshot ../live-snapshot --output ../production-build
```

いずれもデプロイ・メール送信はしません。
ビルドは24時間以内の公開ソース取得を必須とし、現行RSSの記事と旧URLに対応するページが揃っているか検査します。
本番RSSは取得時の内容・GUID・公開日時・件数・順序をバイト単位で保持します。
現行の公開受付スクリプトを取得し、新フォームの項目を接続します。住所変更は問い合わせ受付へ区分を添えて渡します。
本番用スクリプトは正規の本番originでだけ起動します。確認サイトではロードしません。
Turnstile公開設定、favicon、検索所有権確認ファイルを引き継ぎます。秘密鍵は取得しません。
本番用canonical・OGP・RSS・sitemap・robotsを生成し、旧比較デザインや開発資料は成果物に含めません。
トップの「同窓会の記録」は確認中だけ表示し、本番ビルドでセクションごと除外します。記事・資料の既存URLは維持します。
アクセス解析は明示同意後に起動し、フッターから変更できます。

## 検証
```sh
node tools/readiness_qa.cjs . ../qa-chromium ../production-build
QA_BROWSER=webkit node tools/readiness_qa.cjs . ../qa-webkit ../production-build
python tools/verify_release_static.py --build ../production-build --snapshot ../live-snapshot --output ../qa-static
```

Playwrightは運用端末の既存インストールを使用します。
全123ページを幅320/390/1440pxで、送信先を模擬したフォーム・解析同意を10ケースで確認します。
試験では実際の受付先・解析サービスへ通信しません。
実際の受付保存・確認メール受信・配信停止・通知の最終確認は、切替前に許可された試験対象で実施する工程です。

本番へ出す前に最新記事・コメント・資料を再同期し、準備した同一成果物をプレビューで確認してから公開します。
現行本番の受付運用は、この確認サイトの更新では変更しません。

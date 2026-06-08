# Customer Notification Hub

Next.js + TypeScript + Supabaseで、複数チャットの通知を顧客ごとにまとめるMVPです。

## MVPの範囲

- `/customers` 顧客一覧
- `/customers/[id]` 顧客別の通知一覧
- `/api/webhooks/chatwork` Chatwork Webhookを通知として保存
- `/api/webhooks/line` LINE公式アカウント Webhookを通知として保存
- Supabase Authによる画面ログイン

## セットアップ

1. 依存関係をインストールします。

```bash
npm install
```

2. Supabaseプロジェクトを作成し、SQL Editorで以下を実行します。

```bash
supabase/schema.sql
supabase/seed.sql
```

3. `.env.example` を `.env.local` にコピーして値を入れます。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
WEBHOOK_SECRET=local-dev-secret
CHATWORK_WEBHOOK_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側のWebhook保存でのみ使います。ブラウザに公開しないでください。
`CHATWORK_WEBHOOK_TOKEN` はChatworkのWebhook編集画面に表示されるトークンです。本番のChatwork連携では、この値を使って `x-chatworkwebhooksignature` を検証します。

4. Supabase AuthでEmail認証を有効にします。

Supabase Dashboardの Authentication > Providers > Email でEmail providerを有効にします。ローカルMVPでは、メール確認を無効にすると新規登録後すぐ試せます。

5. 開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:3000/login` を開き、メール・パスワードで新規登録またはログインしてください。

## Webhookテスト

`WEBHOOK_SECRET` を設定している場合は、`Authorization: Bearer <WEBHOOK_SECRET>` が必要です。

### Chatwork

ローカルのcurlテストでは `CHATWORK_WEBHOOK_TOKEN` を空にして、`WEBHOOK_SECRET` のBearer認証を使えます。

```bash
curl -X POST http://localhost:3000/api/webhooks/chatwork \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-secret" \
  -d '{
    "webhook_event_type": "message_created",
    "webhook_event": {
      "room_id": "123456789",
      "from_account_id": "42",
      "from_account_name": "山田太郎",
      "body": "Chatworkからのテスト通知です",
      "send_time": 1735689600
    }
  }'
```

`customers.chatwork_room_id` と `room_id` が一致すると、その顧客の通知として保存されます。見つからない場合は `customer_id = null` で保存されます。

## Chatwork連携の運用手順

1. Vercelなどにデプロイして、公開URLを用意します。

```text
https://<your-domain>/api/webhooks/chatwork
```

2. ChatworkのWebhook設定画面でWebhookを作成します。

Webhook URLには上記のURLを入力します。イベントはまずメッセージ作成系を選びます。

3. ChatworkのWebhook編集画面に表示されるトークンをコピーします。

4. `.env.local` とVercelの環境変数に設定します。

```env
CHATWORK_WEBHOOK_TOKEN=ChatworkのWebhookトークン
```

5. ChatworkからWebhookが届くと、アプリは以下を自動抽出します。

```text
room_id
from_account_id / account_id
from_account_name
body
send_time
message_id
```

6. `room_id` と `customers.chatwork_room_id` が一致すれば、その顧客の通知として保存します。

7. 一致しない場合は `customer_id = null` の未紐付け通知として保存します。

半自動化の次ステップは、未紐付け通知の `room_id` を画面に表示し、「このChatworkルームをこの顧客に紐づける」操作を1回だけ行えるようにすることです。

### LINE公式アカウント

```bash
curl -X POST http://localhost:3000/api/webhooks/line \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-secret" \
  -d '{
    "events": [
      {
        "type": "message",
        "timestamp": 1735689600000,
        "source": {
          "type": "user",
          "userId": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        },
        "message": {
          "id": "1",
          "type": "text",
          "text": "LINEからのテスト通知です"
        }
      }
    ]
  }'
```

`customers.line_user_id` と `source.userId` が一致すると、その顧客の通知として保存されます。見つからない場合は `customer_id = null` で保存されます。

## データベース設計

### customers

- `id`
- `name`
- `chatwork_room_id`
- `line_user_id`
- `gmail_address`
- `slack_channel_id`
- `google_chat_space_id`
- `discord_channel_id`
- `created_at`

### notifications

- `id`
- `customer_id`
- `source`
- `sender_name`
- `sender_identifier`
- `message`
- `received_at`
- `raw_payload`
- `created_at`

## Vercelデプロイ

VercelのProject Settings > Environment Variablesに `.env.local` と同じ値を登録してください。Webhook URLは以下になります。

- `https://<your-domain>/api/webhooks/chatwork`
- `https://<your-domain>/api/webhooks/line`

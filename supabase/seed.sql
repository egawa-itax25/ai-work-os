insert into public.customers (
  name,
  chatwork_room_id,
  line_user_id,
  gmail_address,
  slack_channel_id,
  google_chat_space_id,
  discord_channel_id
) values
  (
    '株式会社サンプル',
    '123456789',
    'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'contact@example.com',
    'C0123456789',
    'spaces/AAAAAAAAAAA',
    '123456789012345678'
  )
on conflict do nothing;

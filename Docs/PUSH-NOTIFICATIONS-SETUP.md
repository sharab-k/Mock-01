# Phone push notifications — setup checklist

Parents get a real phone notification (lock-screen banner) when a child is marked absent or a grade notice is created. The in-app inbox stays exactly as it is; push is the extra "tap on the shoulder".

## How it works

```
attendance / marks saved
  → row created in portal_notifications        (already happens today)
  → database trigger → pg_net → POST /api/push/notify   (Vercel, secret-protected)
  → Expo Push API → Google FCM → the parent's phone
```

The app registers each parent's phone (a "push token") after sign-in, and removes it on sign-out. A failure anywhere in the push path never blocks or rolls back the attendance/mark record.

## What I need from you

### 1. Firebase (about 10 minutes, free)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `JE Academy` (Google Analytics can stay off).
2. In the project: **Project overview → Add app → Android**.
   - **Android package name: `com.anonymous.jeacademy`** — it must match exactly (it is the app's real id today; changing it would make phones treat the app as a different one).
   - App nickname: `JE Academy`. Skip the SHA field. Click **Register app**.
   - **Download `google-services.json`** and save it as `C:\Mock-01\mobile\google-services.json` (or send me the file). This file is safe to commit.
3. **Project settings (gear icon) → Service accounts → Generate new private key → Generate key.** A second JSON file downloads.
   - **This one is a secret.** Do not send it in chat and do not commit it. Keep it outside the repo (for example in `Downloads`).
4. Upload that private key to Expo (so Expo can send through Google for you). In a terminal:

   ```bash
   cd C:\Mock-01\mobile
   npx eas-cli credentials --platform android
   ```

   Choose: **production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Set up … → Upload a new service account key**, and pick the file. (Alternative with no terminal: expo.dev → your project → **Credentials** → the Android app → **FCM V1 service account key** → **Add a service account key**.)

### 2. A shared secret (so only your database can trigger pushes)

Make a long random string, e.g. run `openssl rand -hex 32` or use any password generator (32+ characters). Use the **same** value in the next two steps.

### 3. Vercel

Project **mock-01** → Settings → Environment Variables → add `PUSH_WEBHOOK_SECRET` = your secret, for **Production**. Then redeploy (merging the branch triggers one).

### 4. Database

1. Apply the migration (adds the `push_tokens` table, the register/unregister functions and the trigger):

   ```bash
   npx supabase db push --linked
   ```

2. In the Supabase dashboard → **SQL Editor**, run this once (put your secret in the second line). It stores the webhook address and secret in Supabase Vault, not in any file:

   ```sql
   select vault.create_secret('https://www.je-academy.com/api/push/notify', 'push_webhook_url');
   select vault.create_secret('PASTE-YOUR-SECRET-HERE', 'push_webhook_secret');
   ```

   Until both exist the trigger does nothing, so it is safe to apply the migration first.

### 5. Tell me when 1–4 are done

I will then regenerate the database types, build the APK (it needs `google-services.json` and the uploaded key), and we test end to end with a real parent phone.

## Testing

1. Install the new APK on a phone, sign in as a **parent**, tap **Allow** on the notification prompt.
2. As an attendance admin (or Super Admin), mark that parent's child **absent**.
3. Within a few seconds the phone shows "Notification of Absence". Tapping it opens the in-app inbox.

If nothing arrives, check in this order: the permission was allowed on the phone → a row exists in `push_tokens` for that parent → Vercel logs for `/api/push/notify` (401 = secret mismatch) → Supabase logs for `push webhook failed` warnings.

## Notes

- Only **parents** are registered; staff accounts do not receive pushes (the notices are addressed to parents).
- A phone shared by two parents follows whoever signed in last; signing out removes the phone from that account.
- Dead phones (app uninstalled) are removed automatically the first time Expo reports them.
- iOS is not set up (no Apple developer account / iOS build exists today).

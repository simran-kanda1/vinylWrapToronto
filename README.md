# Vinyl Wraps Toronto — Voice Agent Dashboard

Simvana client dashboard + Firebase webhook for the **Vinyl Wraps Toronto Receptionist** Retell agent.

- Agent phone: `+16479316932`
- Agent ID: `agent_7a12089ba145180dc927df2c2d`
- Firebase project: `paolo-96ba8`

## Features

- Firebase email/password login
- Calls stored in Firestore via `retellWebhook`
- Owner-voicemail emails via Gmail SMTP → `paolo@10xid.com`
- Dashboard: outcomes, reason, transcript, recording playback
- Simvana brand colors

## Local frontend

```bash
npm install
npm run dev
```

## Render (important)

Do **not** use a Static Site — it has no `/api/calls` proxy, so Retell fallback won't work and the dashboard can look empty until Firestore is populated.

Use a **Web Service** instead:

- Build: `npm install && npm run build`
- Start: `npm start`
- Env vars: all `VITE_FIREBASE_*`, plus `RETELL_API_KEY`, `RETELL_AGENT_ID`

Or connect the repo with `render.yaml` (Web Service).

## Firebase Function (Retell webhook)

```bash
cd functions
npm install
npm run build
cd ..
```

### Secrets / Gmail SMTP

1. Upgrade `paolo-96ba8` to **Blaze** (required for Cloud Functions + outbound email):
   https://console.firebase.google.com/project/paolo-96ba8/usage/details
2. Create a [Gmail App Password](https://myaccount.google.com/apppasswords) for `simrankaurkanda42@gmail.com`
3. Copy env file and paste the app password:

```bash
cp functions/.env.example functions/.env
# edit functions/.env → set GMAIL_APP_PASSWORD
```

### Deploy

```bash
npx -y firebase-tools@latest use paolo-96ba8
npx -y firebase-tools@latest deploy --only functions:retellWebhook,firestore:rules
```

Webhook URL (paste into Retell agent webhook for `call_analyzed` + `call_ended`):

```
https://us-central1-paolo-96ba8.cloudfunctions.net/retellWebhook
```

## Retell wiring

1. Open the Vinyl Wraps Toronto Receptionist agent in Retell
2. Set the agent webhook URL to the Cloud Function above
3. Ensure events include **call_analyzed** (preferred) and optionally **call_ended**

When `owner_requested`, `call_outcome === owner_voicemail_left`, or `voicemail_message` is present, the function emails you and marks `emailSent` on the Firestore call doc.

## Environment (frontend)

See `.env.example`. Keep `RETELL_API_KEY` server-only (Vite/Vercel proxy). Dashboard prefers Firestore; falls back to Retell if the collection is empty.

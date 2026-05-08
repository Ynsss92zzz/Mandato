import webpush from 'web-push'

if (process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushToSubscription(sub: StoredSubscription, payload: PushPayload) {
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify(payload),
    { urgency: 'normal' },
  )
}

export async function sendPushToMany(subs: StoredSubscription[], payload: PushPayload) {
  await Promise.allSettled(subs.map(s => sendPushToSubscription(s, payload)))
}

/** Sends a push via the Expo Push API — no Firebase/APNs config needed, Expo brokers it. */
export async function sendExpoPush(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: 'default' }))),
  });
}

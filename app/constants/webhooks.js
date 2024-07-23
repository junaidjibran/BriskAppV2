export const appWebhooks = [
  {
    topic : 'app/uninstalled',
    address: 'webhooks'
  },
  {
    topic : 'orders/create',
    address: 'webhookOrderTagging'
  }
]
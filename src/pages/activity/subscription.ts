export const getActivitySubscriptionEndpoint = (
  activityId: string | number,
  nextSubscribed: boolean,
) => {
  const id = encodeURIComponent(String(activityId).trim())
  return `/api/v1/activity/${id}/${nextSubscribed ? 'subscribe' : 'unsubscribe'}`
}

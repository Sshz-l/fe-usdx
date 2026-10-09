import PubSub from 'pubsub-js'

export const SESSION_REFRESH_TOPIC = 'sessionRefresh'

export const notifySessionRefresh = () => {
  PubSub.publish(SESSION_REFRESH_TOPIC)
}

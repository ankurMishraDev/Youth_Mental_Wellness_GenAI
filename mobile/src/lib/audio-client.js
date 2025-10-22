import { WS_PATH } from "@/services/config"

class AudioClient {
  constructor(serverUrl = WS_PATH) {
    this.serverUrl = serverUrl
    this.ws = null
    this.userId = null
    this.onReady = () => {}
    this.onTextReceived = (text) => {}
    this.onTurnComplete = () => {}
    this.onError = (error) => {}
  }

  setUserId(uid) {
    this.userId = uid
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)
        this.ws.onopen = () => {
          if (this.userId) {
            this.ws.send(JSON.stringify({ type: "user_id", data: this.userId }))
          }
        }
        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data)
          if (message.type === "ready") {
            this.onReady()
            resolve()
          } else if (message.type === "text") {
            this.onTextReceived(message.data)
          } else if (message.type === "turn_complete") {
            this.onTurnComplete()
          } else if (message.type === "error") {
            this.onError(message.data)
          }
        }
        this.ws.onerror = (error) => {
          this.onError(error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  sendTextMessage(text) {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "text", data: text }))
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
    }
  }
}

export default AudioClient

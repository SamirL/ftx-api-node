const axios = require('axios')
const crypto = require('crypto')

class FtxRest {
  constructor ({ apiKey, subAccount }) {
    this.apiKey = apiKey
    this.subAccount = subAccount
    this.endPoint = 'https://ftx.com/api/'
  }

  /**
   * Make the HTTP request
   * @param {string} method
   * @param {string} path
   * @param {object} body
   */
  async makeRequest (method, path, body) {
    const normalizedPath = this.endPoint + path
    const headers = this.signRequest(method, normalizedPath, body)
    const result = await axios({
      method,
      url: normalizedPath,
      body,
      headers
    })

    // TODO: Check for throttle and errors

    return result.data
  }

  /**
   * Sign the request
   * @param {string} method
   * @param {string} path
   * @param {object} body
   */
  signRequest (method, path, body = null) {
    const apiKey = this.apiKey
    const timestamp = Date.now()
    const payload = `${timestamp}${method}${path}${body && method === 'POST' ? body : ''}`.toString()
    const signature = crypto.createHmac('sha256', payload).digest('hex')

    const headers = {
      'FTX-KEY': apiKey,
      'FTX-TS': timestamp,
      'FTX-SIGN': signature
    }

    if (this.subAccount) {
      headers['FTX-SUBACCOUNT'] = this.subAccount
    }
  }
}

module.exports = FtxRest

const axios = require('axios')
const crypto = require('crypto')

const ERROR_ENUM = {
  429: 'Too many requests'
}

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
    try {
      const normalizedPath = this.endPoint + path
      const headers = this.signRequest(method, normalizedPath, body)
      const response = await axios({
        method,
        url: normalizedPath,
        body,
        headers
      })

      if (Number(response.status) === 429) {
        throw new Error(ERROR_ENUM[Number(response.status)])
      }

      return response.data
    } catch (error) {
      throw new Error(error.message)
    }
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

  /**
   * List all supported coins
   */
  getCoins () {
    return this.makeRequest('GET', '/coins')
  }

  /**
   * List all futures
   */
  getFutures () {
    return this.makeRequest('GET', '/futures')
  }

  /**
   * List a Future
   * @param {string} name
   */
  getFuture (name) {
    return this.makeRequest('GET', `/futures/${name}`)
  }
}

module.exports = FtxRest

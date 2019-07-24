const axios = require('axios')
const crypto = require('crypto')
const querystring = require('querystring')
const assert = require('assert')

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

  /**
   * Get a Future Stats
   * @param {string} name
   */
  getFutureStat (name) {
    return this.makeRequest('GET', `/futures/${name}/stats`)
  }

  /**
   * Get funding rates
   * @param {object} object
   * @param {number} object.startTime optional
   * @param {number} object.endTime optional
   */
  getFundingRates ({ start_time, end_time }) {
    assert(arguments.length > 0, 'Missing parameter')
    assert(typeof arguments[0] === 'object', 'The parameter must be an object')

    let path = `/funding_rates`

    if (start_time || end_time) {
      path += `?${querystring.stringify(...arguments)}`
    }

    return this.makeRequest('GET', path)
  }

  /**
   * Get funding rates
   * @param {object} object
   * @param {string} object.future_name
   * @param {number} object.resolution
   * @param {number} object.limit optional
   * @param {number} object.startTime optional
   * @param {number} object.endTime optional
   */
  getHistoricalPrices ({
    future_name, resolution = 300, limit = 35, start_time, end_time
  }) {
    assert(arguments.length > 0, 'Missing parameter')
    assert(typeof arguments[0] === 'object', 'The parameter must be an object')
    assert(future_name, 'The parameter must be an object')

    let path = `/futures/${future_name}/mark_candles`

    // Avoid using arguments destructuring because it skips default
    // parameters
    const queryObject = { resolution, limit }

    if (start_time) {
      queryObject.start_time = start_time
    }

    if (end_time) {
      queryObject.end_time = end_time
    }

    path += `?${querystring.stringify(queryObject)}`

    console.log(path)
    return this.makeRequest('GET', path)
  }
}

module.exports = FtxRest

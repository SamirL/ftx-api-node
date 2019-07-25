const axios = require('axios')
const crypto = require('crypto')
const querystring = require('querystring')
const assert = require('assert')
const _ = require('lodash')

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
   * Assert if the arguments are set and if the first one is an object
   * @param {array} params The arguments array passed to a funciton
   */
  assertParams (params) {
    assert(params.length > 0, 'Missing parameter')
    assert(typeof params[0] === 'object', 'The parameter must be an object')
  }

  /**
   * Create a Query Object for querystring.stringify
   * @param {object} object
   */
  createQueryObject (object) {
    const queryObject = {}

    for (const [key, value] of Object.entries(object)) {
      if (!_.isUndefined(value) && !_.isNull(value)) {
        queryObject[key] = value
      }
    }

    return queryObject
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
    this.assertParams(arguments)
    assert(_.isString(future_name), 'Future name must be a string')
    assert(_.isNumber(resolution), 'Resolution must be a number')
    assert(_.isNumber(limit), 'Limit must be a number')

    if (start_time) {
      assert(_.isNumber(start_time), 'Start time must be a number')
    }

    if (end_time) {
      assert(_.isNumber(end_time), 'End time must be a number')
    }

    let path = `/futures/${future_name}/mark_candles`

    const queryObject = this.createQueryObject({ resolution, limit })

    path += `?${querystring.stringify(queryObject)}`

    return this.makeRequest('GET', path)
  }

  /**
   * Get Markets
   */
  getMarkets () {
    return this.makeRequest('GET', '/markets')
  }

  /**
   * Get Market Name
   * @param {string} marketName
   */
  getSingleMarket (marketName) {
    assert(_.isString(marketName), 'Market name must be a string')
    return this.makeRequest('GET', '/markets/' + marketName)
  }

  /**
   * Get Order Book
   *
   * @param {object} object
   * @param {string} object.market_name
   * @param {number} object.depth
   */
  getOrderBook ({ market_name, depth = 20 }) {
    this.assertParams(arguments)
    assert(_.isString(market_name), 'Market name must be a string')
    assert(_.isNumber(depth), 'Depth must be a number')
    assert(depth >= 20 && depth <= 100, 'Depth must be a number between 20 and 100')

    return this.makeRequest('GET', `/markets/${market_name}/orderbook?depth=${depth}`)
  }

  /**
   * Get Trades
   *
   * @param {object} object
   * @param {string} object.market_name
   * @param {number} object.limit
   * @param {number} object.start_time
   * @param {number} object.end_time
   */
  getTrades ({ market_name, limit = 20, start_time, end_time }) {
    this.assertParams(arguments)
    assert(_.isString(market_name), 'Market name must be a string')
    assert(_.isNumber(limit), 'Resolution must be a number')
    assert(_.isNumber(limit), 'Limit must be a number')
    assert(limit >= 20 && limit <= 100, 'Limit must be a number between 20 and 100')

    if (start_time) {
      assert(_.isNumber(start_time), 'Start time must be a number')
    }

    if (end_time) {
      assert(_.isNumber(end_time), 'End time must be a number')
    }

    let path = `/markets/${market_name}/trades`

    const queryObject = this.createQueryObject({ limit, start_time, end_time })

    path += `?${querystring.stringify(queryObject)}`

    return this.makeRequest('GET', path)
  }
}

module.exports = FtxRest

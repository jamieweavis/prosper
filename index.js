#!/usr/bin/env node
'use strict'

// Project Dependencies
const ora = require('ora')
const math = require('mathjs')
const Table = require('cli-table')
const JSDOM = require('jsdom').JSDOM
const chalk = require('chalk')
const prospect = require('caporal')
const request = require('request-promise')
const capitalize = require('capitalize')
const querystring = require('querystring')

// Files
const pjson = require('./package.json')
const queryCodes = require('./queryCodes.json')

// Convenience
const baseUrl = 'https://rocket-league.com/trading/?'

/**
 * Display list of items and item modifiers
 */
function list () {
  const spinner = ora('Searching for item list').start()
  request(baseUrl)
    .then((html) => {
      const document = new JSDOM(html).window.document
      const categories = document.querySelectorAll('optgroup')
      const list = {}

      // Append items
      categories.forEach(category => {
        list[category.label] = []
        const items = category.querySelectorAll('option')
        items.forEach(item => { list[category.label].push({ id: item.value, name: item.textContent.trim() }) })
      })

      // Append item modifiers
      Object.keys(queryCodes).forEach(category => {
        list[capitalize(category)] = []
        for (const [name, id] of Object.entries(queryCodes[category])) {
          list[capitalize(category)].push({ id: id, name: name })
        }
      })

      spinner.succeed('Successfully retrieved item list\n')

      for (const [category, items] of Object.entries(list)) {
        console.log(chalk.blue(category))
        const table = new Table({
          head: ['ID', 'Name'],
          style: { head: ['blue'], compact: true }
        })
        items.forEach(item => { table.push([item.id, item.name]) })
        console.log(table.toString())
      }
    })
}

/**
 * Aggregates sell offers and outputs price statistics
 *
 * @param {Number} args.itemId
 * @param {String} options.certification
 * @param {String} options.paint
 * @param {String} options.platform
 * @param {Number} options.page
 */
function sellOffers (args, options) {
  const spinner = ora('Searching sell offers...').start()
  const queryString = querystring.stringify({
    filterItem: args.itemId,
    filterCertification: queryCodes.certification[options.certification],
    filterPaint: queryCodes.paint[options.paint],
    filterPlatform: queryCodes.platform[options.platform],
    filterSearchType: 1, // Sell
    p: options.page
  })

  request(baseUrl + queryString)
    .then(html => {
      const document = new JSDOM(html).window.document
      const tradeOffers = document.querySelectorAll('.rlg-trade-display-items')
      const prices = []

      tradeOffers.forEach(tradeOffer => {
        // Find sell grid index
        let sellIndex
        const sellItems = tradeOffer.querySelectorAll('#rlg-youritems a')
        sellItems.forEach((theirItem, index) => {
          if (theirItem.href.match(/\?filterItem=(\d*)&/)[1] === args.itemId) sellIndex = index
        })

        // Find matching for item
        const forItems = tradeOffer.querySelectorAll('#rlg-theiritems a')
        const forItem = forItems[sellIndex]
        if (!forItem) return // No matching for item

        if (forItem.href.match(/\?filterItem=(\d*)&/)[1] !== '496') return // Not selling for keys

        const price = forItem.querySelector('.rlg-trade-display-item__amount')
        if (!price) return // No quantity of keys specified
        prices.push(parseInt(price.innerHTML))
      })
      if (prices.length === 0) return spinner.fail(chalk.red('No matching sell offers found'))

      let title = document.querySelector('option:checked').innerHTML
      if (options.certification !== 'None') title += ` [${options.certification}]`
      if (options.paint !== 'None') title += ` (${options.paint})`
      spinner.succeed(`Found ${chalk.blue(prices.length)} eligible sell offers for ${chalk.blue(title)}`)
      logPriceStats(prices)
    })
}

/**
 * Aggregates buy offers and outputs price statistics
 *
 * @param {Number} args.itemId
 * @param {String} options.certification
 * @param {String} options.paint
 * @param {String} options.platform
 * @param {Number} options.page
 */
function buyOffers (args, options) {
  const spinner = ora('Searching buy offers...').start()
  const queryString = querystring.stringify({
    filterItem: args.itemId,
    filterCertification: queryCodes.certification[options.certification],
    filterPaint: queryCodes.paint[options.paint],
    filterPlatform: queryCodes.platform[options.platform],
    filterSearchType: 2, // Buy
    p: options.page
  })

  request(baseUrl + queryString)
    .then(html => {
      const document = new JSDOM(html).window.document
      const tradeOffers = document.querySelectorAll('.rlg-trade-display-items')
      const prices = []

      tradeOffers.forEach(tradeOffer => {
        // Find sell grid index
        let sellIndex
        const sellItems = tradeOffer.querySelectorAll('#rlg-theiritems a')
        sellItems.forEach((theirItem, index) => {
          if (theirItem.href.match(/\?filterItem=(\d*)&/)[1] === args.itemId) sellIndex = index
        })

        // Find matching for item
        const forItems = tradeOffer.querySelectorAll('#rlg-youritems a')
        const forItem = forItems[sellIndex]
        if (!forItem) return // No matching for item

        if (forItem.href.match(/\?filterItem=(\d*)&/)[1] !== '496') return // Not selling for keys

        const price = forItem.querySelector('.rlg-trade-display-item__amount')
        if (!price) return // No quantity of keys specified
        prices.push(parseInt(price.innerHTML))
      })

      if (prices.length === 0) return spinner.fail(chalk.red('No matching buy offers found'))

      let title = document.querySelector('option:checked').innerHTML
      if (options.certification !== 'None') title += ` [${options.certification}]`
      if (options.paint !== 'None') title += ` (${options.paint})`
      spinner.succeed(`Found ${chalk.blue(prices.length)} eligible buy offers for ${chalk.blue(title)}`)
      logPriceStats(prices)
    })
}

/**
 * Display statistics from array of prices
 *
 * @param {Number[]} prices
 */
function logPriceStats (prices) {
  const min = math.min(prices)
  const minCount = prices.filter(x => { return x === min }).length
  const mean = math.round(math.mean(prices), 2)
  const median = math.round(math.median(prices), 2)
  const mode = math.mode(prices)
  const modeCount = prices.filter(x => { return x === mode[0] }).length
  const max = math.max(prices)
  const maxCount = prices.filter(x => { return x === max }).length

  const table = new Table({
    head: ['', 'Min', 'Mean', 'Median', 'Mode', 'Max'],
    style: { head: ['blue'], compact: true }
  })
  table.push({
    'Price': [chalk.green(min), mean, median, mode.toString(), chalk.red(max)]
  }, {
    'Count': [chalk.green(minCount), chalk.grey('----'), chalk.grey('------'), modeCount, chalk.red(maxCount)]
  })
  console.log(table.toString())
}

prospect
  .version(pjson.version)
  .help(`💎  ${capitalize(pjson.name)} - ${pjson.description}`)

  // List Items
  .command('list', 'Display list of items and item modifiers')
  .alias('ls')
  .action(list)

  // Sell offers
  .command('sell-offers', 'Display item sell offer statistics')
  .alias('sell')
  .argument('<item-id>', 'Item ID number', /^\d*$/)
  .option('--certification <name>', 'Specify the item certification', Object.keys(queryCodes.certification), 'None')
  .option('--paint <colour>', 'Specify the item paint colour', Object.keys(queryCodes.paint), 'None')
  .option('--platform <name>', 'Specify the platform', Object.keys(queryCodes.platform), 'Steam')
  .option('-p, --page <number>', 'Specify the page number', /^\d*$/, 1)
  .action(sellOffers)

  // Buy offers
  .command('buy-offers', 'Display item buy offer statistics')
  .alias('buy')
  .argument('<item-id>', 'Item ID number', /^\d*$/)
  .option('--certification <name>', 'Specify the item certification', Object.keys(queryCodes.certification), 'None')
  .option('--paint <colour>', 'Specify the item paint colour', Object.keys(queryCodes.paint), 'None')
  .option('--platform <name>', 'Specify the platform', Object.keys(queryCodes.platform), 'Steam')
  .option('-p, --page <number>', 'Specify the page number', /^\d*$/, 1)
  .action(buyOffers)

prospect.parse(process.argv)

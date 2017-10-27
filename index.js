#!/usr/bin/env node
'use strict'

// Project Dependencies
const ora = require('ora')
const math = require('mathjs')
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
 * Display list of categories
 */
function listCategories () {
  request(baseUrl)
    .then((html) => {
      const document = new JSDOM(html).window.document
      const categories = document.querySelectorAll('optgroup')

      console.log(`\n${chalk.blue.underline('Categories')}\n`)
      categories.forEach(category => {
        console.log(category.label)
      })
    })
}

/**
 * Display list of items with options category option to filter to sub-category
 *
 * @param {String=} args.category
 */
function listItems (args) {
  const spinner = ora('Searching items').start()
  request(baseUrl)
    .then((html) => {
      const document = new JSDOM(html).window.document
      const categorySelector = (args.category) ? `optgroup[label="${args.category}"]` : 'optgroup'
      const categories = document.querySelectorAll(categorySelector)

      spinner.succeed('Successfully retrieved item list')
      categories.forEach(category => {
        console.log(`\n${chalk.blue.underline('ID')}\t${chalk.blue.underline(category.label)}\n`)
        const items = category.querySelectorAll('option')
        items.forEach(item => {
          console.log(`${chalk.dim(item.value)}\t${item.textContent.trim()}`)
        })
      })
    })
}

/**
 * @TODO: Description
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
    filterSearchType: queryCodes.search['Sell'],
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
 * @TODO: Description
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
    filterSearchType: queryCodes.search['Buy'],
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
 * @param {String} title
 * @param {Number[]} prices
 */
function logPriceStats (title, prices) {
  console.log(`\n${chalk.magenta.underline(title)}`)
  if (prices.length === 0) return console.log(`\n${chalk.red('No matching trade offers found')}`)
  console.log(`\n${chalk.blue.underline('Stat')}\t${chalk.blue.underline('Value')}\t${chalk.blue.underline('Count')}\n`)

  const min = math.min(prices)
  const minCount = prices.filter(x => { return x === min }).length
  console.log(`Min\t${chalk.green(min)}\t${minCount}`)
  console.log(`Mean\t${math.round(math.mean(prices), 2)}`)
  console.log(`Median\t${math.round(math.median(prices), 2)}`)

  const mode = math.mode(prices)
  const modeCount = prices.filter(x => { return x === mode[0] }).length
  console.log(`Mode\t${mode}\t${modeCount}`)

  const max = math.max(prices)
  const maxCount = prices.filter(x => { return x === max }).length
  console.log(`Max\t${chalk.red(math.max(prices))}\t${maxCount}\n`)
  console.log(`Stats calculated from ${chalk.blue(prices.length)} offers`)
}

prospect
  .version(pjson.version)
  .help(`💎  ${capitalize(pjson.name)} - ${pjson.description}`)

  // List Categories
  .command('list-categories', 'Display list of categories')
  .alias('categories')
  .action(listCategories)

  // List Items
  .command('list-items', 'Display list of items')
  .alias('items')
  .argument('[category]', 'Display list of items in a specific category')
  .action(listItems)

  // List Certifications
  // @TODO: Implement

  // List Paints
  // @TODO: Implement

  // List Platforms
  // @TODO: Implement

  // Sell offers
  .command('sell-offers', 'Display item sell offer statistics')
  .alias('sell')
  .argument('<item-id>', 'Item ID number', /^\d*$/)
  .option('-p, --page <number>', 'Specify the page number', /^\d*$/, 1)
  .option('--certification <name>', 'Specify the item certification', Object.keys(queryCodes.certification), 'None')
  .option('--paint <colour>', 'Specify the item paint colour', Object.keys(queryCodes.paint), 'None')
  .option('--platform <name>', 'Specify the platform', Object.keys(queryCodes.platform), 'Steam')
  .action(sellOffers)

  // Buy offers
  .command('buy-offers', 'Display item buy offer statistics')
  .alias('buy')
  .argument('<item-id>', 'Item ID number', /^\d*$/)
  .option('-p, --page <number>', 'Specify the page number', /^\d*$/, 1)
  .option('--certification <name>', 'Specify the item certification', Object.keys(queryCodes.certification), 'None')
  .option('--paint <colour>', 'Specify the item paint colour', Object.keys(queryCodes.paint), 'None')
  .option('--platform <name>', 'Specify the platform', Object.keys(queryCodes.platform), 'Steam')
  .option('--platform <name>', 'Specify the platform', Object.keys(queryCodes.platform), 'Steam')
  .action(buyOffers)

prospect.parse(process.argv)

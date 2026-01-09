/**
 * lib/log.js
 *
 * Prefixed logging with maritime easter eggs.
 */

const PREFIX = 'shipwright:'

const QUOTES = [
  'Smooth seas never made a skilled shipwright.',
  "A ship in harbor is safe, but that's not what ships are built for.",
  "Red sky at night, sailor's delight. Green build output, developer's delight.",
  'Fair winds and following seas to your assets.',
  'The sea finds out everything you did wrong. So does production.',
  "We're gonna need a bigger bundle.",
  "I'm the captain of this asset pipeline now.",
  'Ahoy! Spotted land at .tmp/public/'
]

const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)]

const createLogger = (sailsLog) => ({
  error: (msg, ...args) => sailsLog.error(`${PREFIX} ${msg}`, ...args),
  warn: (msg, ...args) => sailsLog.warn(`${PREFIX} ${msg}`, ...args),
  info: (msg, ...args) => sailsLog.info(`${PREFIX} ${msg}`, ...args),
  verbose: (msg, ...args) => sailsLog.verbose(`${PREFIX} ${msg}`, ...args),
  silly: (msg, ...args) => {
    sailsLog.silly(`${PREFIX} ${msg}`, ...args)
    sailsLog.silly(`${PREFIX} 🚢 ${randomQuote()}`)
  }
})

module.exports = { createLogger, randomQuote }

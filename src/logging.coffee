logger = GLOBAL.logger = require 'winston'
logger.exitOnError = false
logger.remove logger.transports.Console
logger.add logger.transports.Console,
  colorize:   process.stdout.isTTY
  timestamp:  true

module.exports = logger
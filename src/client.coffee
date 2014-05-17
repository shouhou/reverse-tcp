config = require '../config.json'

logger = require('./logging.js')
forwarding = require('./forwarding.js').remote2local()

io = require 'socket.io-client'
socket = io config.server + ':' + config.server_port + '?password=' + encodeURIComponent(config.password)

port_l2r = {}
port_r2l = {}

for binding in config.bindings
  if port_l2r[binding.local]? or port_r2l[binding.remote]?
    throw new Error 'port already in use: local:' + binding.local + ' <-> public:' + binding.remote

  port_l2r[binding.local] = binding.remote
  port_r2l[binding.remote] = binding.local

logger.info 'connecting...'

socket.on 'error', (err) ->
  logger.error err.stack

socket.on 'connect', ->
  logger.info 'connected'
  config.bindings.forEach (binding) ->
    socket.emit '/forwarding/create', port: binding.remote, (ack) ->
      if ack.ok
        logger.info 'established local:%d <-> public:%d', binding.local, binding.remote
      else
        logger.error 'failed to establish local:%d <-> public:%d', binding.local, binding.remote
        logger.error ack.error

socket.on '/forwarding/connect', (data) ->
  return if not data.client_id?
  return if not data.port?
  return if not port_r2l[data.port]?
  forwarding.connect socket, data.client_id, port_r2l[data.port]

socket.on '/forwarding/data', (data) ->
  return if not data.client_id?
  return if not data.data?
  forwarding.data data.client_id, data.data

socket.on '/forwarding/close', (data) ->
  return if not data.client_id?
  forwarding.end data.client_id
config = require '../config.json'

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

console.log 'connecting...'

socket.on 'error', (err) ->
  console.log err

socket.on 'connect', ->
  console.log 'connected'
  config.bindings.forEach (binding) ->
    socket.emit '/forwarding/create', port: binding.remote, (ack) ->
      if ack.ok
        console.log 'established local:%d <-> public:%d', binding.local, binding.remote
      else
        console.log 'failed to establish local:%d <-> public:%d', binding.local, binding.remote
        console.log ack.error

socket.on '/forwarding/connect', (data) ->
  return if not data.client_id?
  return if not data.port?
  return if not port_r2l[data.port]?
  console.log 'connect local:%d <-- public:%d', port_r2l[data.port], data.port
  forwarding.connect socket, data.client_id, port_r2l[data.port]

socket.on '/forwarding/data', (data) ->
  return if not data.client_id?
  return if not data.data?
  forwarding.data data.client_id, data.data

socket.on '/forwarding/close', (data) ->
  return if not data.client_id?
  console.log 'close local:%d <-- public:%d', port_r2l[data.port], data.port
  forwarding.end data.client_id
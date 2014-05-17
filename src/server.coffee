config = require '../config.json'

forwarding = require('./forwarding.js').local2remote()

io = require('socket.io')()
io.listen config.server_port

io.use (socket, next) ->
  hs = socket.request
  if not hs._query.password? or hs._query.password isnt config.password
    next new Error('not authorized')
  else
    next()

io.on 'connection', (socket) ->
  console.log 'endpoint connected'
  socket.on '/forwarding/create', (data, ack) ->
    if not data.port?
      return ack error: 'missing port parameter'
    
    port = parseInt data.port
    if isNaN port
      return ack error: 'invalid port number'

    if port <= 0 or port >= 65536 or port is config.server_port
      return ack error: 'invalid port number'

    forwarding.create port, socket, (err) ->
      if err
        console.log 'failed to establish public:%d', port
        console.log err.message
        return ack error: err.message
      else
        console.log 'established public:%d', port
        return ack ok: true

  socket.on '/forwarding/data', (data) ->
    return if not data.client_id?
    return if not data.data?
    forwarding.data data.client_id, data.data

  socket.on '/forwarding/end', (data) ->
    return if not data.client_id?
    forwarding.end data.client_id

  socket.on 'disconnect', ->
    console.log 'endpoint disconnected'
    forwarding.destroyAll socket
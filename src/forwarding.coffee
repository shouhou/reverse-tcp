net = require 'net'
flake = require 'flake-idgen'

_gc = -> gc() if gc?

class Local2RemoteForwarding

  constructor: ->
    @clients = {}
    @servers = {}
    @idgen = new flake()

  # create a forwarding rule
  create: (port, socket, callback) =>
    port = parseInt port
    if @servers[port]?
      return callback && callback new Error 'port in use'

    server = @createServer port, socket

    cb_flag = false
    server.on 'error', (err) ->
      if cb_flag
        console.log err
      else
        cb_flag = true
        if err.code is 'EADDRINUSE'
          return callback && callback new Error 'port in use by other applications'
        else if err.code is 'EACCES'
          return callback && callback new Error 'no privilege to bind port'
        else
          return callback && callback err

    server.listen port, =>
      socket.__ports = {} if not socket.__ports?
      socket.__ports[port] = true

      @servers[port] = server
      callback && callback()

  # destroy a forwarding rule
  destroy: (port, socket, callback) =>
    port = parseInt port
    if not socket.__ports[port]?
      return callback && callback new Error 'port not binded'

    for client_id, client of @clients
      if client.localPort is port
        client.end()

    @servers[port].close()
    delete @servers[port]

    delete socket.__ports[port]
    callback && callback()

  destroyAll: (socket) =>
    for port, _ of socket.__ports
      @destroy port, socket

  createServer: (port, socket) =>
    return net.createServer (client) =>
      
      client.__id = @idgen.next()
      @clients[client.__id] = client

      client.setNoDelay true

      console.log 'client connected: public:%d', port
      socket.emit '/forwarding/connect',
        port:         port
        client_id:    client.__id
        remoteAddress:client.remoteAddress
        remotePort:   client.remotePort

      client.on 'data', (data) ->
        socket.emit '/forwarding/data',
          port:       port
          client_id:  client.__id
          data:       data

      client.on 'error', (err) ->
        socket.emit '/forwarding/error',
          port:       port
          client_id:  client.__id
          error:      err

      client.on 'close', =>
        console.log 'client closed: public:%d', port
        delete @clients[client.__id]
        socket.emit '/forwarding/close',
          port:       port
          client_id:  client.__id

  data: (client_id, data) =>
    return if not @clients[client_id]?
    @clients[client_id].write data

  end: (client_id) =>
    return if not @clients[client_id]?
    @clients[client_id].end()

class Remote2LocalForwarding

  constructor: ->
    @clients = {}

  connect: (socket, client_id, port) =>
    return if @clients[client_id]?
    client = net.connect port: port
    @clients[client_id] = client
    
    client.on 'data', (data) ->
      socket.emit '/forwarding/data',
        client_id: client_id
        data:      data

    client.on 'end', (data) ->
      socket.emit '/forwarding/end',
        client_id: client_id

    client.on 'error', (err) ->
      console.log err

    client.on 'close', =>
      delete @clients[client_id]

  data: (client_id, data) =>
    return if not @clients[client_id]?
    @clients[client_id].write data

  end: (client_id) =>
    return if not @clients[client_id]?
    @clients[client_id].end()

module.exports =
  local2remote: -> new Local2RemoteForwarding()
  remote2local: -> new Remote2LocalForwarding()
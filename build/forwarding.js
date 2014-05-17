(function() {
  var Local2RemoteForwarding, Remote2LocalForwarding, flake, net, _gc,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  net = require('net');

  flake = require('flake-idgen');

  _gc = function() {
    if (typeof gc !== "undefined" && gc !== null) {
      return gc();
    }
  };

  Local2RemoteForwarding = (function() {
    function Local2RemoteForwarding() {
      this.end = __bind(this.end, this);
      this.data = __bind(this.data, this);
      this.createServer = __bind(this.createServer, this);
      this.destroyAll = __bind(this.destroyAll, this);
      this.destroy = __bind(this.destroy, this);
      this.create = __bind(this.create, this);
      this.clients = {};
      this.servers = {};
      this.idgen = new flake();
    }

    Local2RemoteForwarding.prototype.create = function(port, socket, callback) {
      var cb_flag, server;
      port = parseInt(port);
      if (this.servers[port] != null) {
        return callback && callback(new Error('port in use'));
      }
      server = this.createServer(port, socket);
      cb_flag = false;
      server.on('error', function(err) {
        if (cb_flag) {
          return console.log(err);
        } else {
          cb_flag = true;
          if (err.code === 'EADDRINUSE') {
            return callback && callback(new Error('port in use by other applications'));
          } else if (err.code === 'EACCES') {
            return callback && callback(new Error('no privilege to bind port'));
          } else {
            return callback && callback(err);
          }
        }
      });
      return server.listen(port, (function(_this) {
        return function() {
          if (socket.__ports == null) {
            socket.__ports = {};
          }
          socket.__ports[port] = true;
          _this.servers[port] = server;
          return callback && callback();
        };
      })(this));
    };

    Local2RemoteForwarding.prototype.destroy = function(port, socket, callback) {
      var client, client_id, _ref;
      port = parseInt(port);
      if (socket.__ports[port] == null) {
        return callback && callback(new Error('port not binded'));
      }
      _ref = this.clients;
      for (client_id in _ref) {
        client = _ref[client_id];
        if (client.localPort === port) {
          client.end();
        }
      }
      this.servers[port].close();
      delete this.servers[port];
      delete socket.__ports[port];
      return callback && callback();
    };

    Local2RemoteForwarding.prototype.destroyAll = function(socket) {
      var port, _, _ref, _results;
      _ref = socket.__ports;
      _results = [];
      for (port in _ref) {
        _ = _ref[port];
        _results.push(this.destroy(port, socket));
      }
      return _results;
    };

    Local2RemoteForwarding.prototype.createServer = function(port, socket) {
      return net.createServer((function(_this) {
        return function(client) {
          client.__id = _this.idgen.next();
          _this.clients[client.__id] = client;
          client.setNoDelay(true);
          console.log('client connected: public:%d', port);
          socket.emit('/forwarding/connect', {
            port: port,
            client_id: client.__id,
            remoteAddress: client.remoteAddress,
            remotePort: client.remotePort
          });
          client.on('data', function(data) {
            return socket.emit('/forwarding/data', {
              port: port,
              client_id: client.__id,
              data: data
            });
          });
          client.on('error', function(err) {
            return socket.emit('/forwarding/error', {
              port: port,
              client_id: client.__id,
              error: err
            });
          });
          return client.on('close', function() {
            console.log('client closed: public:%d', port);
            delete _this.clients[client.__id];
            return socket.emit('/forwarding/close', {
              port: port,
              client_id: client.__id
            });
          });
        };
      })(this));
    };

    Local2RemoteForwarding.prototype.data = function(client_id, data) {
      if (this.clients[client_id] == null) {
        return;
      }
      return this.clients[client_id].write(data);
    };

    Local2RemoteForwarding.prototype.end = function(client_id) {
      if (this.clients[client_id] == null) {
        return;
      }
      return this.clients[client_id].end();
    };

    return Local2RemoteForwarding;

  })();

  Remote2LocalForwarding = (function() {
    function Remote2LocalForwarding() {
      this.end = __bind(this.end, this);
      this.data = __bind(this.data, this);
      this.connect = __bind(this.connect, this);
      this.clients = {};
    }

    Remote2LocalForwarding.prototype.connect = function(socket, client_id, port) {
      var client;
      if (this.clients[client_id] != null) {
        return;
      }
      client = net.connect({
        port: port
      });
      this.clients[client_id] = client;
      client.on('data', function(data) {
        return socket.emit('/forwarding/data', {
          client_id: client_id,
          data: data
        });
      });
      client.on('end', function(data) {
        return socket.emit('/forwarding/end', {
          client_id: client_id
        });
      });
      client.on('error', function(err) {
        return console.log(err);
      });
      return client.on('close', (function(_this) {
        return function() {
          return delete _this.clients[client_id];
        };
      })(this));
    };

    Remote2LocalForwarding.prototype.data = function(client_id, data) {
      if (this.clients[client_id] == null) {
        return;
      }
      return this.clients[client_id].write(data);
    };

    Remote2LocalForwarding.prototype.end = function(client_id) {
      if (this.clients[client_id] == null) {
        return;
      }
      return this.clients[client_id].end();
    };

    return Remote2LocalForwarding;

  })();

  module.exports = {
    local2remote: function() {
      return new Local2RemoteForwarding();
    },
    remote2local: function() {
      return new Remote2LocalForwarding();
    }
  };

}).call(this);

(function() {
  var binding, config, forwarding, io, port_l2r, port_r2l, socket, _i, _len, _ref;

  config = require('../config.json');

  forwarding = require('./forwarding.js').remote2local();

  io = require('socket.io-client');

  socket = io(config.server + ':' + config.server_port + '?password=' + encodeURIComponent(config.password));

  port_l2r = {};

  port_r2l = {};

  _ref = config.bindings;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    binding = _ref[_i];
    if ((port_l2r[binding.local] != null) || (port_r2l[binding.remote] != null)) {
      throw new Error('port already in use: local:' + binding.local + ' <-> public:' + binding.remote);
    }
    port_l2r[binding.local] = binding.remote;
    port_r2l[binding.remote] = binding.local;
  }

  console.log('connecting...');

  socket.on('error', function(err) {
    return console.log(err);
  });

  socket.on('connect', function() {
    var _j, _len1, _ref1, _results;
    console.log('connected');
    _ref1 = config.bindings;
    _results = [];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      binding = _ref1[_j];
      _results.push(socket.emit('/forwarding/create', {
        port: binding.remote
      }, function(ack) {
        if (ack.ok) {
          return console.log('established local:%d <-> public:%d', binding.local, binding.remote);
        } else {
          console.log('failed to establish local:%d <-> public:%d', binding.local, binding.remote);
          return console.log(ack.error);
        }
      }));
    }
    return _results;
  });

  socket.on('/forwarding/connect', function(data) {
    if (data.client_id == null) {
      return;
    }
    if (data.port == null) {
      return;
    }
    if (port_r2l[data.port] == null) {
      return;
    }
    console.log('connect local:%d <-- public:%d', port_r2l[data.port], data.port);
    return forwarding.connect(socket, data.client_id, port_r2l[data.port]);
  });

  socket.on('/forwarding/data', function(data) {
    if (data.client_id == null) {
      return;
    }
    if (data.data == null) {
      return;
    }
    return forwarding.data(data.client_id, data.data);
  });

  socket.on('/forwarding/close', function(data) {
    if (data.client_id == null) {
      return;
    }
    console.log('close local:%d <-- public:%d', port_r2l[data.port], data.port);
    return forwarding.end(data.client_id);
  });

}).call(this);
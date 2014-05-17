(function() {
  var binding, config, forwarding, io, logger, port_l2r, port_r2l, socket, _i, _len, _ref;

  config = require('../config.json');

  logger = require('./logging.js');

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

  logger.info('connecting...');

  socket.on('error', function(err) {
    return logger.error(err.stack);
  });

  socket.on('connect', function() {
    logger.info('connected');
    return config.bindings.forEach(function(binding) {
      return socket.emit('/forwarding/create', {
        port: binding.remote
      }, function(ack) {
        if (ack.ok) {
          return logger.info('established local:%d <-> public:%d', binding.local, binding.remote);
        } else {
          logger.error('failed to establish local:%d <-> public:%d', binding.local, binding.remote);
          return logger.error(ack.error);
        }
      });
    });
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
    return forwarding.end(data.client_id);
  });

}).call(this);

(function() {
  var config, forwarding, io, logger;

  config = require('../config.json');

  logger = require('./logging.js');

  forwarding = require('./forwarding.js').local2remote();

  io = require('socket.io')();

  io.listen(config.server_port);

  io.use(function(socket, next) {
    var hs;
    hs = socket.request;
    if ((hs._query.password == null) || hs._query.password !== config.password) {
      return next(new Error('not authorized'));
    } else {
      return next();
    }
  });

  io.on('connection', function(socket) {
    socket.on('/forwarding/create', function(data, ack) {
      var port;
      if (data.port == null) {
        return ack({
          error: 'missing port parameter'
        });
      }
      port = parseInt(data.port);
      if (isNaN(port)) {
        return ack({
          error: 'invalid port number'
        });
      }
      if (port <= 0 || port >= 65536 || port === config.server_port) {
        return ack({
          error: 'invalid port number'
        });
      }
      return forwarding.create(port, socket, function(err) {
        if (err) {
          logger.error('failed to establish public:%d', port);
          logger.error(err.message);
          return ack({
            error: err.message
          });
        } else {
          logger.info('established public:%d', port);
          return ack({
            ok: true
          });
        }
      });
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
    socket.on('/forwarding/end', function(data) {
      if (data.client_id == null) {
        return;
      }
      return forwarding.end(data.client_id);
    });
    return socket.on('disconnect', function() {
      return forwarding.destroyAll(socket);
    });
  });

}).call(this);

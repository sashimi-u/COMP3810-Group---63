module.exports = function createServerStartGuard(serverStartId) {
  return function serverStartGuard(req, res, next) {
    try {
      const clientServerId = req.session && req.session._serverStart;

      if (clientServerId !== serverStartId) {
        if (req.session && req.session.user) {
          // authenticated session created under different server start — clear it
          req.session = null;
          res.clearCookie('session');
        } else {
          // for unauthenticated clients, set the marker so we don't repeatedly clear
          req.session = req.session || {};
          req.session._serverStart = serverStartId;
        }
      }
    } catch (err) {
      // if anything goes wrong, continue without blocking
    }
    next();
  };
};

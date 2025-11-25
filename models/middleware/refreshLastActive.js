module.exports = function (onlineUsers) {
  return function refreshLastActive(req, res, next) {
    try {
      if (req.session && req.session.user && req.session.user.username) {
        onlineUsers.set(req.session.user.username, Date.now());
      }
    } catch (e) {
      // ignore errors and continue
    }
    next();
  };
};

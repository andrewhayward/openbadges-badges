const openbadger = require('../lib/openbadger');
const url = require('url');
const validator = require('validator');

exports.home = function home (req, res, next) {
  return res.render('core/home.html');
}

exports.claim = function claim (req, res, next) {
  var code = (req.query.code||'').trim();

  function end (err) {
    if (err)
      req.flash('error', err);

    return res.render('core/claim-new.html', {
      code: code
    });
  }

  if (!code)
    return end();

  openbadger.getBadgeFromCode( { code: code, email: '' }, function(err, data) {
    if (err && err.message.indexOf('already has badge') <= -1)
      // should probably send back to the summit page with an error message
      return end(err.message);

    var badge = data.badge;

    if (!badge)
      return end('Invalid claim code');

    return res.render('core/claim.html', {
      badge: badge,
      code: code
    });
  });
};

exports.processClaim = function processClaim (req, res, next) {
  var code = req.body.code;
  var recipientEmail = req.body.email;
  var redirect = url.format({
    pathname: res.locals.url('claim'),
    query: {code: code}
  });

  function end (err) {
    if (err)
      req.flash('error', err);
    return res.redirect(redirect);
  }

  try {
    validator.check(recipientEmail, 'Please enter a valid email address.').isEmail();
  } catch (e) {
    return end(e.message);
  }

  openbadger.getBadgeFromCode( { code: code, email: recipientEmail }, function(err, data) {
    if (err)
      return end(err.message);

    var badge = data.badge;

    if (!badge)
      return end();

    openbadger.claim( { code: code, learner: { email: recipientEmail } }, function(err, data) {
      if (err)
        return end(err.message);

      console.log(JSON.stringify(data));
      badge.assertionUrl = data.url;
      res.render('core/send-to-backpack.html', {
        badge: badge,
        email: recipientEmail
      });
    });
  });
};
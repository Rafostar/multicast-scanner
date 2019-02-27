var mdns = require('multicast-dns');
var find = require('array-find');
var xtend = require('xtend');
var dnstxt = require('dns-txt')();

var defaults = {
  ttl: 5000,
  service_name: '_googlecast._tcp.local',
  service_type: 'PTR',
  mdns: {}
};

module.exports = (opts, cb) => {
  if(typeof opts === 'function') {
    cb = opts;
    opts = defaults;
  } else {
    opts = xtend(defaults, opts);
  }

  var devices = [];
  var m = mdns(opts.mdns);
  var timer = setTimeout(() => {
    close();
    if(devices.length == 0) cb(new Error('device not found'));
    else cb(null, devices);
  }, opts.ttl);

  var onResponse = response => {
    var answer = response.answers[0];

    if(answer &&
        (answer.name !== opts.service_name ||
         answer.type !== opts.service_type)) {
      return;
    }

    var resp_a = find(response.additionals, entry => {
      return entry.type === 'A';
    });

    var resp_txt = find(response.additionals, entry => {
      return entry.type === 'TXT';
    });

    var info = {
      name: resp_a.name,
      friendlyName: dnstxt.decode(resp_txt.data).fn,
      ip: resp_a.data
    };

    if(!info || (opts.name && info.name !== opts.name)) return;

    devices.push(info);
    return;
  };

  m.on('response', onResponse);

  m.query({
    questions:[{
      name: opts.service_name,
      type: opts.service_type
    }]
  });

  var close = () => {
    m.removeListener('response', onResponse);
    clearTimeout(timer);
    m.destroy();
  };

  return close;
};

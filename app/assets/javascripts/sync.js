var $,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

$ = jQuery;

this.RenderSync = {
  ready: false,
  readyQueue: [],
  init: function() {
    return $((function(_this) {
      return function() {
        if (!((typeof RenderSyncConfig !== "undefined" && RenderSyncConfig !== null) && RenderSync[RenderSyncConfig.adapter])) {
          return;
        }
        _this.adapter || (_this.adapter = new RenderSync[RenderSyncConfig.adapter]);
        if (_this.isReady() || !_this.adapter.available()) {
          return;
        }
        _this.ready = true;
        _this.connect();
        _this.flushReadyQueue();
        return _this.bindUnsubscribe();
      };
    })(this));
  },
  bindUnsubscribe: function() {
    $(document).bind("page:before-change", (function(_this) {
      return function() {
        return _this.adapter.unsubscribeAll();
      };
    })(this));
    return $(document).bind("page:restore", (function(_this) {
      return function() {
        return _this.reexecuteScripts();
      };
    })(this));
  },
  reexecuteScripts: function() {
    var i, len, ref, results, script;
    ref = $("script[data-sync-id]");
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      script = ref[i];
      results.push(eval($(script).html()));
    }
    return results;
  },
  onConnectFailure: function(error) {},
  connect: function() {
    return this.adapter.connect();
  },
  isConnected: function() {
    return this.adapter.isConnected();
  },
  onReady: function(callback) {
    if (this.isReady()) {
      return callback();
    } else {
      return this.readyQueue.push(callback);
    }
  },
  flushReadyQueue: function() {
    var callback, i, len, ref;
    ref = this.readyQueue;
    for (i = 0, len = ref.length; i < len; i++) {
      callback = ref[i];
      this.onReady(callback);
    }
    return this.readyQueue = [];
  },
  isReady: function() {
    return this.ready;
  },
  camelize: function(str) {
    return str.replace(/(?:^|[-_])(\w)/g, function(match, camel) {
      var ref;
      return (ref = camel != null ? camel.toUpperCase() : void 0) != null ? ref : '';
    });
  },
  viewClassFromPartialName: function(partialName, resourceName) {
    var ref, ref1;
    return (ref = (ref1 = RenderSync[this.camelize(resourceName + "_" + partialName)]) != null ? ref1 : RenderSync[this.camelize(partialName)]) != null ? ref : RenderSync.View;
  }
};

RenderSync.Adapter = (function() {
  function Adapter() {}

  Adapter.prototype.subscriptions = [];

  Adapter.prototype.unsubscribeAll = function() {
    var i, len, ref, subscription;
    ref = this.subscriptions;
    for (i = 0, len = ref.length; i < len; i++) {
      subscription = ref[i];
      subscription.cancel();
    }
    return this.subscriptions = [];
  };

  Adapter.prototype.unsubscribeChannel = function(channel) {
    var i, index, len, ref, sub;
    ref = this.subscriptions;
    for (index = i = 0, len = ref.length; i < len; index = ++i) {
      sub = ref[index];
      if (!(sub.channel === channel)) {
        continue;
      }
      sub.cancel();
      this.subscriptions.splice(index, 1);
      return;
    }
  };

  Adapter.prototype.subscribe = function(channel, callback) {
    var subscription;
    this.unsubscribeChannel(channel);
    subscription = new RenderSync[RenderSyncConfig.adapter].Subscription(this.client, channel, callback);
    this.subscriptions.push(subscription);
    return subscription;
  };

  return Adapter;

})();

RenderSync.Faye = (function(superClass) {
  extend(Faye, superClass);

  function Faye() {
    return Faye.__super__.constructor.apply(this, arguments);
  }

  Faye.prototype.subscriptions = [];

  Faye.prototype.available = function() {
    return !!window.Faye;
  };

  Faye.prototype.connect = function() {
    return this.client = new window.Faye.Client(RenderSyncConfig.server);
  };

  Faye.prototype.isConnected = function() {
    var ref;
    return ((ref = this.client) != null ? ref.getState() : void 0) === "CONNECTED";
  };

  return Faye;

})(RenderSync.Adapter);

RenderSync.Faye.Subscription = (function() {
  function Subscription(client, channel, callback) {
    this.client = client;
    this.channel = channel;
    this.fayeSub = this.client.subscribe(channel, callback);
  }

  Subscription.prototype.cancel = function() {
    return this.fayeSub.cancel();
  };

  return Subscription;

})();

RenderSync.Pusher = (function(superClass) {
  extend(Pusher, superClass);

  function Pusher() {
    return Pusher.__super__.constructor.apply(this, arguments);
  }

  Pusher.prototype.subscriptions = [];

  Pusher.prototype.available = function() {
    return !!window.Pusher;
  };

  Pusher.prototype.connect = function() {
    var opts;
    opts = {
      encrypted: RenderSyncConfig.pusher_encrypted
    };
    if (RenderSyncConfig.pusher_ws_host) {
      opts.wsHost = RenderSyncConfig.pusher_ws_host;
    }
    if (RenderSyncConfig.pusher_ws_port) {
      opts.wsPort = RenderSyncConfig.pusher_ws_port;
    }
    if (RenderSyncConfig.pusher_wss_port) {
      opts.wssPort = RenderSyncConfig.pusher_wss_port;
    }
    return this.client = new window.Pusher(RenderSyncConfig.api_key, opts);
  };

  Pusher.prototype.isConnected = function() {
    var ref;
    return ((ref = this.client) != null ? ref.connection.state : void 0) === "connected";
  };

  Pusher.prototype.subscribe = function(channel, callback) {
    var subscription;
    this.unsubscribeChannel(channel);
    subscription = new RenderSync.Pusher.Subscription(this.client, channel, callback);
    this.subscriptions.push(subscription);
    return subscription;
  };

  return Pusher;

})(RenderSync.Adapter);

RenderSync.Pusher.Subscription = (function() {
  function Subscription(client, channel, callback) {
    var pusherSub;
    this.client = client;
    this.channel = channel;
    pusherSub = this.client.subscribe(channel);
    pusherSub.bind('sync', callback);
  }

  Subscription.prototype.cancel = function() {
    if (this.client.channel(this.channel) != null) {
      return this.client.unsubscribe(this.channel);
    }
  };

  return Subscription;

})();

RenderSync.View = (function() {
  View.prototype.removed = false;

  function View($el1, name) {
    this.$el = $el1;
    this.name = name;
  }

  View.prototype.beforeUpdate = function(html, data) {
    alert('beforeupda');
    return this.update(html);
  };

  View.prototype.afterUpdate = function() {
    alert('afterupdate');
  };

  View.prototype.beforeInsert = function($el, data) {
    alert('beforeinsert');
    return this.insert($el);
  };

  View.prototype.afterInsert = function() {
    alert('afterinsert');
  };

  View.prototype.beforeRemove = function() {
    alert('beforeremove');
    return this.remove();
  };

  View.prototype.afterRemove = function() {
    alert('afterremove');
  };

  View.prototype.isRemoved = function() {
    return this.removed;
  };

  View.prototype.remove = function() {
    this.$el.remove();
    this.$el = $();
    this.removed = true;
    return this.afterRemove();
  };

  View.prototype.bind = function() {};

  View.prototype.show = function() {
    return this.$el.show();
  };

  View.prototype.update = function(html) {
    var $new;
    $new = $($.trim(html));
    this.$el.replaceWith($new);
    this.$el = $new;
    this.afterUpdate();
    return this.bind();
  };

  View.prototype.insert = function($el) {
    this.$el.replaceWith($el);
    this.$el = $el;
    this.afterInsert();
    return this.bind();
  };

  return View;

})();

RenderSync.Partial = (function() {
  Partial.prototype.attributes = {
    name: null,
    resourceName: null,
    resourceId: null,
    authToken: null,
    channelUpdate: null,
    channelDestroy: null,
    selectorStart: null,
    selectorEnd: null,
    refetch: false,
    subscriptionUpdate: null,
    subscriptionDestroy: null
  };

  function Partial(attributes) {
    var defaultValue, key, ref, ref1;
    if (attributes == null) {
      attributes = {};
    }
    ref = this.attributes;
    for (key in ref) {
      defaultValue = ref[key];
      this[key] = (ref1 = attributes[key]) != null ? ref1 : defaultValue;
    }
    this.$start = $("[data-sync-id='" + this.selectorStart + "']");
    this.$end = $("[data-sync-id='" + this.selectorEnd + "']");
    this.$el = this.$start.nextUntil(this.$end);
    this.view = new (RenderSync.viewClassFromPartialName(this.name, this.resourceName))(this.$el, this.name);
    this.adapter = RenderSync.adapter;
  }

  Partial.prototype.subscribe = function() {
    this.subscriptionUpdate = this.adapter.subscribe(this.channelUpdate, (function(_this) {
      return function(data) {
        if (_this.refetch) {
          return _this.refetchFromServer(function(html) {
            return _this.update(html);
          });
        } else {
          return _this.update(data.html);
        }
      };
    })(this));
    return this.subscriptionDestroy = this.adapter.subscribe(this.channelDestroy, (function(_this) {
      return function() {
        return _this.remove();
      };
    })(this));
  };

  Partial.prototype.update = function(html) {
    return this.view.beforeUpdate(html, {});
  };

  Partial.prototype.remove = function() {
    this.view.beforeRemove();
    if (this.view.isRemoved()) {
      return this.destroy();
    }
  };

  Partial.prototype.insert = function(html) {
    if (this.refetch) {
      return this.refetchFromServer((function(_this) {
        return function(html) {
          return _this.view.beforeInsert($($.trim(html)), {});
        };
      })(this));
    } else {
      return this.view.beforeInsert($($.trim(html)), {});
    }
  };

  Partial.prototype.destroy = function() {
    var ref;
    this.subscriptionUpdate.cancel();
    this.subscriptionDestroy.cancel();
    this.$start.remove();
    this.$end.remove();
    if ((ref = this.$el) != null) {
      ref.remove();
    }
    delete this.$start;
    delete this.$end;
    return delete this.$el;
  };

  Partial.prototype.refetchFromServer = function(callback) {
    return $.ajax({
      type: "GET",
      url: "/sync/refetch.json",
      data: {
        auth_token: this.authToken,
        partial_name: this.name,
        resource_name: this.resourceName,
        resource_id: this.resourceId
      },
      success: function(data) {
        return callback(data.html);
      }
    });
  };

  return Partial;

})();

RenderSync.PartialCreator = (function() {
  PartialCreator.prototype.attributes = {
    name: null,
    resourceName: null,
    authToken: null,
    channel: null,
    selector: null,
    direction: 'append',
    refetch: false
  };

  function PartialCreator(attributes) {
    var defaultValue, key, ref, ref1;
    if (attributes == null) {
      attributes = {};
    }
    ref = this.attributes;
    for (key in ref) {
      defaultValue = ref[key];
      this[key] = (ref1 = attributes[key]) != null ? ref1 : defaultValue;
    }
    this.$el = $("[data-sync-id='" + this.selector + "']");
    this.adapter = RenderSync.adapter;
  }

  PartialCreator.prototype.subscribe = function() {
    return this.adapter.subscribe(this.channel, (function(_this) {
      return function(data) {
        return _this.insert(data.html, data.resourceId, data.authToken, data.channelUpdate, data.channelDestroy, data.selectorStart, data.selectorEnd);
      };
    })(this));
  };

  PartialCreator.prototype.insertPlaceholder = function(html) {
    switch (this.direction) {
      case "append":
        return this.$el.before(html);
      case "prepend":
        return this.$el.after(html);
    }
  };

  PartialCreator.prototype.insert = function(html, resourceId, authToken, channelUpdate, channelDestroy, selectorStart, selectorEnd) {
    var partial;
    this.insertPlaceholder("<script type='text/javascript' data-sync-id='" + selectorStart + "'></script>\n<script type='text/javascript' data-sync-el-placeholder></script>\n<script type='text/javascript' data-sync-id='" + selectorEnd + "'></script>");
    partial = new RenderSync.Partial({
      name: this.name,
      resourceName: this.resourceName,
      resourceId: resourceId,
      authToken: authToken,
      channelUpdate: channelUpdate,
      channelDestroy: channelDestroy,
      selectorStart: selectorStart,
      selectorEnd: selectorEnd,
      refetch: this.refetch
    });
    partial.subscribe();
    return partial.insert(html);
  };

  return PartialCreator;

})();

RenderSync.init();

// ---
// generated by coffee-script 1.9.2
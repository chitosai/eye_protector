var OPTIONS = {
  basic: {
    // 工作模式
    mode: 'positive',
    // 背景色
    replaceBgWithColor: '#C1E6C6',
    // 豆沙绿
    defaultBgColor: '#C1E6C6',
    // 替换背景色的亮度阈值
    bgColorBrightnessThreshold: .9,
    // 边框色
    replaceBorderWithColor: 'rgba(0, 0, 0, .35)',
    // 替换边框色的亮度阈值
    borderColorBrightnessThreshold: .5,
    // 是否替换文字颜色
    replaceTextColor: true,
    // 是否替换文本输入框背景色
    replaceTextInput: false
  },
  // 忽略的特殊class
  ignoreClass: ['highlight', 'syntax', 'code'],
  // 主动模式 - 忽略的网站列表
  positiveList: [],
  // 被动模式 - 要替换的域名列表
  passiveList: []
}

// 检查对象是否为空
function is_object_empty(obj) {
  for(var key in obj) {
    return false;
  }
  return true;
}

// array.remove
Array.prototype.remove = function(key) {
  var index = this.indexOf(key);
  if( index > -1 ) this.splice(index, 1);
  return this;
}

// shortcut
function $(id) {
  return document.getElementById(id);
}
function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

var storage = chrome.storage.sync;

function readOption(callback) {
  storage.get('option', function(obj) {
    if( obj.option && obj.option.basic ) {
      OPTIONS = obj['option'];
    }
    callback && typeof callback == 'function' && callback();
  });
}

function saveOption(callback) {
  storage.set({'option': OPTIONS}, callback);
}

// 获取当前激活标签页域名
function getHost(url) {
  var host = /https?:\/\/([^/]+)\//.exec(url);
  if( host && host.length > 1 ) {
    host = host[1];
    if( host.startsWith('www.') ) {
      return host.slice(4);
    } else {
      return host;
    }
  } else {
    return false;
  }
}

// i18n
function _(msg) {
  return chrome.i18n.getMessage(msg);
}
function i18n() {
  // render texts
  var nodes = $$('[data-text]');
  nodes.forEach(function(node) {
    node.innerHTML = _(node.dataset.text);
  });

  // add language to body
  document.body.setAttribute('lang', chrome.i18n.getUILanguage());
}
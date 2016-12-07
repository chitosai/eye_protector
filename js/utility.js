var option = {
  // 背景色
  replaceBgWithColor: '#C1E6C6',
  // 替换背景色的亮度阈值
  bgColorBrightnessThreshold: .9,
  // 边框色
  replaceBorderWithColor: 'rgba(0, 0, 0, .35)',
  // 替换边框色的亮度阈值
  borderColorBrightnessThreshold: .5,
  // 是否替换边框样式
  replaceBorderStyle: false,

  // 是否替换文字颜色
  replaceTextColor: true,
  // 是否替换文本输入框背景色
  replaceTextInput: false,

  // 忽略的特殊class
  ignoreClass: ['highlight', 'syntax', 'code'],

  // 主动模式 - 忽略的网站列表
  ignoreDomainList: [],
  // 被动模式 - 要替换的域名列表
  replaceDomainList: [],
  // 强制替换的页面列表
  loopDomainList: []
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
    return document.querySelectorAll(selector);
}

var storage = chrome.storage.sync;

function readOption(callback) {
  storage.get('option', function(obj) {
    if( !is_object_empty(obj) ) {
      Object.assign(option, obj['option']);
    }
    callback && typeof callback == 'function' && callback();
  });
}

function saveOption() {
  storage.set({'option': option});
}

// 获取当前激活标签页域名
function getHost(url) {
  var host = /https?:\/\/([^/]+)\//.exec(url)[1];
  if( host.length < 2 ) {
    return false;
  } else {
    return host;
  }
}
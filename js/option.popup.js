var url, host;

function onClick() {
  var list = OPTIONS[this.id+'List'];
      
  if( list.indexOf(host) > -1 ) {
    list.remove(host);
  } else {
    list.push(host);
  }
  saveOption();

  // toggle class
  this.classList.toggle('checked');
}

function init() {
  i18n();

  // 获取当前激活tab的域名
  chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs) {
    url = tabs[0].url, host = getHost(url);
    if( !host ) {
      $('normal').style.display = 'none';
      $('error').textContent = _('strProtocolMsg');
      return;
    }

    // 读取当前域名的配置
    readOption(function() {
      var mode = OPTIONS.basic.mode,
          list = OPTIONS[mode + 'List'],
          btn = $(mode);

      // 显示当前模式
      $('mode').textContent = ( mode == 'positive' ? _('strPositive') : _('strPassive') );
      $('mode').href = chrome.runtime.getURL('/options.html');

      // 根据运行模式产生按钮状态
      btn.style.display = 'block';
      if( list.indexOf(host) > -1 ) {
        btn.classList.add('checked');
      }
    })
  });

  // 修改设置
  $$('.item').forEach(function(node) {
    node.addEventListener('click', onClick);
  });
}

init();
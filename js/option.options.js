var CLICKLISTENERS = {
  check: function() {
    var key = this.id;

    // 根据选项类型反转选项
    var option = OPTIONS.basic[key];
    if( typeof option == 'boolean' ) {
      OPTIONS.basic[key] = !option;
    };
    saveOption();

    // toggle class
    this.classList.toggle('checked');
  },
  radio: function() {
    var key = this.getAttribute('name'),
	      val = this.id,
	      nodes = $$('.item[name=' + key + ']');

    nodes.forEach(function(node) {
      node.classList.remove('checked');
    });
    this.classList.add('checked');

    OPTIONS.basic[key] = this.id;
    saveOption();
  },
  pickColor: function() {
  	var color = this.value.trim().replace(/[^0-9a-fA-F]/g, ''),
        preview = $('color-preview'),
				btn = $('color-save');
    // 确保color中不包含非0-9a-fA-F的字符，且长度为3或6
  	if( color == this.value && (color.length == 3 || color.length == 6) ) {
	  	preview.style.backgroundColor = '#' + color;
  		btn.disabled = false;
  	} else {
  		preview.style.backgroundColor = '#fff';
  		btn.disabled = true;
  	}
  },
  saveColor: function() {
    var color = $('color').value.trim().toUpperCase();
    if( color.length == 3 ) {
      color = [color[0], color[0], color[1], color[1], color[2], color[2]].join('');
    }
    OPTIONS.basic.replaceBgWithColor = '#' + color;
    saveOption(function() {
      $('color-save-success').style.display = 'block';
    });
  },
  restoreColor: function() {
    var color = OPTIONS.basic.defaultBgColor;
    OPTIONS.basic.replaceBgWithColor = color;
    saveOption(function() {
      $('color-preview').style.backgroundColor = color;
      $('color').value = color.slice(1);
    });
  }
}

function init() {
  // i18n
  i18n();

  // 读取设置
  readOption(function() {
    var options = OPTIONS.basic,
	      key, node;
    for(key in options) {
      if( options[key] === true ) {
        node = $(key);
        if(node) {
          node.classList.add('checked');
        }
      }
    }

    // 工作模式暂时没想到怎么做通用，就做个特例吧
    $(OPTIONS.basic.mode).classList.add('checked');

    // 背景色
    $('color-preview').style.backgroundColor = OPTIONS.basic.replaceBgWithColor;
    $('color').value = OPTIONS.basic.replaceBgWithColor.slice(1);
  });

  // 修改设置
  var nodes = $$('.item');
  nodes.forEach(function(node) {
    node.addEventListener('click', CLICKLISTENERS[node.getAttribute('type')]);
  });

  // 修改背景色
  $('color').addEventListener('input', CLICKLISTENERS.pickColor);
  $('color-save').addEventListener('click', CLICKLISTENERS.saveColor);
  $('color-restore').addEventListener('click', CLICKLISTENERS.restoreColor);

  // options页面在打开的情况下，如果用户切到其他tabs修改了OPTIONS，这边需要及时更新
  // 不然可能出现options页面打开太久，OPTIONS中的list已经不是最新的，然后options触发了一次saveOptions造成
  // options页面打开之后的修改丢失的情况
  chrome.storage.onChanged.addListener(readOption);
}

init();
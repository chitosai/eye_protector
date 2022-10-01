// Map polyfill
if (typeof Map != "function") {
  Map = function () {};
  Map.uid = 1;
  Map.prototype.data = {};
  Map.prototype.set = function (obj, value) {
    this.data[obj.uid || (obj.uid = Map.uid++)] = value;
  };
  Map.prototype.get = function (obj) {
    return obj.uid ? this.data[obj.uid] : false;
  };
}

var STYLES = new Map();

/**
 * 获取元素样式
 *
 */
const getStyle = (node, key) => {
  return window.getComputedStyle(node, null)[key];
};
// 设置元素样式，同时缓存它原有的样式
const setStyle = (node, key, val) => {
  // 获取原始样式
  const originStyle = getStyle(node, key),
    styleCache = STYLES.get(node) || {};

  // 新增样式
  if (!styleCache[key]) {
    styleCache[key] = originStyle;
    STYLES.set(node, styleCache);
  }

  setTimeout(() => {
    node.style[key] = val;
  }, 0);
};

/**
 * 获取rgba数组
 *
 */
var parseRGBA = function (str) {
  var rgba = str.match(/[\d\.]+/g);
  return [Number(rgba[0]), Number(rgba[1]), Number(rgba[2]), rgba.length == 4 ? Number(rgba[3]) : 1];
};

/**
 * 计算亮度
 *
 */
function _calcBrightness(bgColor) {
  var rgba = parseRGBA(bgColor);
  // alpha通道为0是transparent
  if (!rgba[3]) return false;

  // 把RGB转换为亮度
  return (0.2126 * rgba[0]) / 255 + (0.7152 * rgba[1]) / 255 + (0.072 * rgba[2]) / 255;
}
Element.prototype.calcBrightness = function (key) {
  // 读取颜色数据
  var bgColor = getStyle(this, key);
  if (!bgColor) return false;

  return _calcBrightness(bgColor);
};

/**
 * 根据预设的class列表跳过特定div，直接用IndexOf是因为这样highlight/highlight/highlighter之类的不用重复了
 * @return true dom中包含需要跳过的class
 * @return false 不包含
 *
 */
var skipNodes = ["SCRIPT", "BR", "CANVAS", "IMG", "svg"];
Element.prototype.shouldBeIgnored = function () {
  if (skipNodes.indexOf(this.nodeName) > -1) {
    return true;
  }
  var ignoreClassList = OPTIONS.ignoreClass,
    len = ignoreClassList.length;
  var _class = this.getAttribute("class");
  var _id = this.id;
  for (var i = 0; i < len; i++) {
    if ((_class && _class.toLowerCase().indexOf(ignoreClassList[i]) > -1) || (_id && _id.toLowerCase().indexOf(ignoreClassList[i]) > -1)) {
      return true;
    }
  }
  return false;
};

/*
 * 替换颜色
 * @return 3 设置了背景色，且背景色亮度超过阈值，替换了背景色
 * @return 2 设置了背景色，但背景色亮度没有超过阈值，没有替换背景色
 * @return 1 元素没有设置背景色
 * @return 0 此元素依照config中的设置跳过不处理
 */
const replaceBackgroundColor = (node) => {
  // input[type=text]，用户选择「不替换输入框颜色」
  if (node.nodeName == "INPUT" && !OPTIONS.basic.replaceTextInput) {
    return 0;
  }

  // 根据亮度判断是否需要替换
  const brightness = node.calcBrightness("background-color");
  if (!brightness) return 1;

  if (brightness > OPTIONS.basic.bgColorBrightnessThreshold) {
    setStyle(node, "background-color", OPTIONS.basic.replaceBgWithColor);
    return 3;
  } else {
    return 2;
  }
};

/**
 * 修改Border颜色
 *
 */
Element.prototype.replaceBorderColor = function () {
  // 四边各自计算
  var sides = ["top", "bottom", "left", "right"],
    i = 0,
    len = sides.length;

  var borderWidthAttrString = "border-%s-width",
    borderColorAttrString = "border-%s-color",
    borderColorAttr,
    borderWidth,
    borderBrightness;

  for (; i < len; i++) {
    // 先判断下是否有边框
    borderWidth = getStyle(this, borderWidthAttrString.replace("%s", sides[i]));
    if (!borderWidth) continue;

    // 然后判断是否需要替换颜色
    borderColorAttr = borderColorAttrString.replace("%s", sides[i]);
    borderBrightness = this.calcBrightness(borderColorAttr);
    if (!borderBrightness) continue;

    if (borderBrightness > OPTIONS.basic.borderColorBrightnessThreshold) {
      setStyle(this, borderColorAttr, OPTIONS.basic.replaceBorderWithColor);
    }
  }

  // box-shadow，如果有位移和扩散都为0的box-shadow，我们就认为这个box-shadow是border
  var shadow = getStyle(this, "box-shadow");
  var m = /(rgb\(\d+, \d+, \d+\)) 0px 0px 0px (\d+)px/.exec(shadow);
  if (m && _calcBrightness(m[1])) {
    setStyle(this, "box-shadow", `${OPTIONS.basic.replaceBorderWithColor} 0px 0px 0px ${m[2]}px`);
  }
};

/**
 * 修改文字颜色
 *
 */
Element.prototype.replaceTextColor = function () {
  if (!OPTIONS.basic.replaceTextColor) return false;

  // 文字亮度
  var brightness = this.calcBrightness("color"),
    color;
  if (!brightness) return false;

  // 确认此元素亮度过高且没有背景图片
  var bgImage = getStyle(this, "background-image");
  if (brightness > OPTIONS.basic.borderColorBrightnessThreshold && (!bgImage || bgImage == "none")) {
    // 替换文字颜色
    setStyle(this, "color", "#000");
  }

  // TODO: 有时候虽然当前元素没有背景图片，但其实文字浮动在父元素或其他元素的背景图片上，造成文字看不清
};

/**
 * 替换颜色啦啦啦
 * @param bool processOther 是否处理边框、文字等其他颜色，此参数继承
 *
 */
const replaceColor = (node, processOther = false) => {
  // 包含highlight/player等特征的节点应当直接跳过，其子节点也不必再遍历
  if (node.shouldBeIgnored()) {
    return;
  }

  // 替换背景色
  var bgColorReplacReturn = replaceBackgroundColor(node);
  // 根据是否替换了背景色决定是否要处理边框、文字颜色等
  // 当返回值为2、3时说明当前节点是有背景色的，应当根据当前节点的情况修改processOther
  // 其他情况继续沿用父节点传下来的值
  if (bgColorReplacReturn == 3) {
    processOther = true;
  } else if (bgColorReplacReturn == 2) {
    processOther = false;
  }

  if (processOther) {
    // 替换边框色
    node.replaceBorderColor();
    // 替换文本颜色
    node.replaceTextColor();
  }

  // 递归
  var children = node.childNodes,
    i = 0,
    len = children.length;
  for (; i < len; i++) {
    if (children[i].nodeType == 1) {
      replaceColor(children[i], processOther);
    }
  }
  benchmark.tick();
};

/**
 * 回复页面原始样式
 *
 */
function restoreColor() {
  var nodes = $$(".eye-protector-processed"),
    node,
    originalStyle,
    key,
    i = 0,
    len = nodes.length;
  for (; i < len; i++) {
    node = nodes[i];
    originalStyle = STYLES.get(node);
    if (!originalStyle) continue;

    for (key in originalStyle) {
      if (key == "transition") {
        setTimeout(function () {
          node.style.transition = originalStyle.transition;
        }, 300);
      } else {
        node.style[key] = originalStyle[key];
      }
    }
  }
}

// 用mutationObserver代替监听DOMSubtreeModified事件，后者有性能缺陷：
// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events
var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    var len = mutation.addedNodes.length;
    for (var i = 0; i < len; i++) {
      var node = mutation.addedNodes[i];
      // 先向上遍历一遍祖先，确认是否需要处理当前节点
      var ancestor = node,
        shouldIgnore = false;
      while ((ancestor = ancestor.parentNode) && ancestor.nodeName != "BODY") {
        if (ancestor.shouldBeIgnored()) {
          shouldIgnore = true;
          break;
        }
      }
      // 文本节点内容改变也会触发mutation，而text并不是正经的node
      if (!shouldIgnore && node.nodeType == 1) {
        replaceColor(node);
      }
    }
  });
});
var observerConfig = {
  childList: true,
  subtree: true,
};

function init() {
  readOption(function () {
    if ((OPTIONS.basic.mode == "positive" && OPTIONS.positiveList.includes(host)) || (OPTIONS.basic.mode == "passive" && !OPTIONS.passiveList.includes(host))) {
      restoreColor();
      observer.disconnect();
      return false;
    }
    // always set background to <html> element
    setStyle(document.querySelector("html"), "backgroundColor", OPTIONS.basic.replaceBgWithColor);
    // body需要特殊处理，当body的background-color为transparent时实际上页面是白色
    // 此时也需要给body设置背景色
    const body = document.body,
      brightness = body.calcBrightness("background-color");
    if (!brightness || brightness > OPTIONS.basic.bgColorBrightnessThreshold) {
      setStyle(body, "background-color", OPTIONS.basic.replaceBgWithColor);
      setStyle(body, "transition", "background-color .3s ease");
    }
    // 遍历DOM
    Array.from(body.children).forEach(replaceColor);
    // watch dom changes
    observer.observe(body, observerConfig);
  });
}

// benchmark
var benchmark = new Benchmark();
// 保存域名
var host = getHost(document.location.href);
// 设置改变时重新读取设置
chrome.storage.onChanged.addListener(init);
// GO
init();

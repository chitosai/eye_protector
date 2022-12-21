var CACHED_STYLES = new Map();

/**
 * 获取元素样式
 *
 */
const getStyle = (node, key) => {
  return window.getComputedStyle(node)[key];
};
// 设置元素样式，同时缓存它原有的样式
const setStyle = (node, key, val) => {
  // 获取原始样式
  const originStyle = getStyle(node, key),
    styleCache = CACHED_STYLES.get(node) || {};

  // 把原始样式保存下来
  if (!styleCache[key]) {
    CACHED_STYLES.set(node, {
      ...styleCache,
      [key]: originStyle,
    });
  }

  // 修改为新样式，以前这里可以直接同步改，但react流行之后似乎有些使用react的页面我们直接修改会造成react报错，例如知乎
  // 试了一下解决方式就是我们把样式修改改为异步进行，让react先完成她的执行周期就不会有冲突了
  setTimeout(() => {
    node.style[key] = val;
  }, 0);
};

/**
 * 获取rgba数组
 *
 */
const parseRGBA = (str) => {
  const rgba = str.match(/[\d\.]+/g);
  return [Number(rgba[0]), Number(rgba[1]), Number(rgba[2]), rgba.length == 4 ? Number(rgba[3]) : 1];
};

/**
 * 计算亮度
 *
 */
const calcBrightness = (colorString) => {
  const rgba = parseRGBA(colorString);
  // alpha通道为0是transparent
  if (!rgba[3]) return false;

  // 把RGB转换为亮度
  return (0.2126 * rgba[0]) / 255 + (0.7152 * rgba[1]) / 255 + (0.072 * rgba[2]) / 255;
};
const getNodeStyleBrightness = (node, key) => {
  // 读取颜色数据
  const colorString = getStyle(node, key);
  return colorString ? calcBrightness(colorString) : false;
};

/**
 * 根据预设的class列表跳过特定div，直接用IndexOf是因为这样highlight/highlight/highlighter之类的不用重复了
 * @return true dom中包含需要跳过的class
 * @return false 不包含
 *
 */
const shouldBeIgnored = (node) => {
  if (OPTIONS.skipNodeTypes.includes(node.nodeName)) {
    return true;
  }
  const classnames = node.getAttribute("class")?.toLowerCase() || "";
  const _id = node.id?.toLowerCase() || "";
  if (!classnames && !_id) {
    return false;
  }
  for (const ic of OPTIONS.ignoreClass) {
    if (classnames.includes(ic) || _id.includes(ic)) {
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
  const brightness = getNodeStyleBrightness(node, "background-color");
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
const replaceBorderColor = (node) => {
  // 四边各自计算
  const sides = ["top", "bottom", "left", "right"];

  const borderWidthAttrString = "border-%s-width",
    borderColorAttrString = "border-%s-color";
  let borderColorAttr, borderWidth, borderBrightness;

  for (const side of sides) {
    // 先判断下是否有边框
    borderWidth = getStyle(node, borderWidthAttrString.replace("%s", side));
    if (!borderWidth) continue;

    // 然后判断是否需要替换颜色
    borderColorAttr = borderColorAttrString.replace("%s", side);
    borderBrightness = getNodeStyleBrightness(node, borderColorAttr);
    if (!borderBrightness) continue;

    if (borderBrightness > OPTIONS.basic.borderColorBrightnessThreshold) {
      setStyle(node, borderColorAttr, OPTIONS.basic.replaceBorderWithColor);
    }
  }

  // box-shadow，如果有位移和扩散都为0的box-shadow，我们就认为这个box-shadow是border
  const shadow = getStyle(node, "box-shadow");
  const m = /(rgb\(\d+, \d+, \d+\)) 0px 0px 0px (\d+)px/.exec(shadow);
  if (m && calcBrightness(m[1])) {
    setStyle(node, "box-shadow", `${OPTIONS.basic.replaceBorderWithColor} 0px 0px 0px ${m[2]}px`);
  }
};

/**
 * 修改文字颜色
 *
 */
const replaceTextColor = (node) => {
  if (!OPTIONS.basic.replaceTextColor) return false;

  // 文字亮度
  const brightness = getNodeStyleBrightness(node, "color");
  if (!brightness) return false;

  // 确认此元素亮度过高且没有背景图片
  const bgImage = getStyle(node, "background-image");
  if (brightness > OPTIONS.basic.borderColorBrightnessThreshold && (!bgImage || bgImage == "none")) {
    // 替换文字颜色
    setStyle(node, "color", "#000");
  }

  // TODO: 有时候虽然当前元素没有背景图片，但其实文字浮动在父元素或其他元素的背景图片上，造成文字看不清
};

/**
 * 替换颜色啦啦啦
 * @param bool processOther 是否处理边框、文字等其他颜色，此参数继承
 *
 */
const replaceColor = (node, processOther = false) => {
  // nodeType != 1 表示这不是一个正常的element: https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
  // 包含highlight/player等特征的节点应当直接跳过，其子节点也不必再遍历
  if (node.nodeType !== 1 || shouldBeIgnored(node)) {
    return;
  }

  // 替换背景色
  const bgColorReplacReturn = replaceBackgroundColor(node);
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
    replaceBorderColor(node);
    // 替换文本颜色
    replaceTextColor(node);
  }

  // 递归
  node.childNodes.forEach((child) => replaceColor(child, processOther));

  benchmark.tick();
};

/**
 * 回复页面原始样式
 *
 */
const restoreColor = () => {
  const modifiedNodes = CACHED_STYLES.keys();
  for (const node of modifiedNodes) {
    // 感觉这里会存在内存泄漏，一个dom如果已经被页面逻辑移除了，但是却被eye-protector缓存下来了那是不是就永远不会被释放了？
    const cahcedStyles = CACHED_STYLES.get(node);
    for (const key in cahcedStyles) {
      setStyle(node, key, cahcedStyles[key]);
    }
  }
};

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
        if (shouldBeIgnored(ancestor)) {
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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function init() {
  await readOption();
  if ((OPTIONS.basic.mode == "positive" && OPTIONS.positiveList.includes(host)) || (OPTIONS.basic.mode == "passive" && !OPTIONS.passiveList.includes(host))) {
    restoreColor();
    observer.disconnect();
    return false;
  }
  // 1. 当系统不处在深色模式时，一切逻辑正常执行
  if (!isNightMode) {
    // always set background to <html> element
    setStyle(document.documentElement, "backgroundColor", OPTIONS.basic.replaceBgWithColor);
    // body需要特殊处理，当body的background-color为transparent时实际上页面是白色
    // 此时也需要给body设置背景色
    const body = document.body,
      brightness = getNodeStyleBrightness(body, "background-color");
    // 全黑时brightness = 0，一定要排除出去
    if ((!brightness && brightness !== 0) || brightness > OPTIONS.basic.bgColorBrightnessThreshold) {
      setStyle(body, "background-color", OPTIONS.basic.replaceBgWithColor);
      setStyle(body, "transition", "background-color .3s ease");
    }
    // 遍历DOM
    Array.from(body.children).forEach(replaceColor);
    // watch dom changes
    observer.observe(body, observerConfig);
  } else {
    // 2. 当系统处于深色模式，且html or body的背景色足够深时，我就简单粗暴的认为这个网站是有深色样式的，跳过一切逻辑让网页原样显示
    // 有的网站会把深色样式加在html上有的会在body上，也可能会加在别的地方吧，但我们就只处理两种最常见的情况，其他的就随缘吧
    await wait(10); // 网页切换深色模式有时会有一定延迟，我们也稍微等一下
    const html = document.querySelector("html"),
      htmlBrightness = getNodeStyleBrightness(html, "background-color");
    const body = document.body,
      bodyBrightness = getNodeStyleBrightness(body, "background-color");
    // 亮度 = 0时是纯黑色，不需要改色
    // 亮度为true且小于阈值时不需要改色
    if (htmlBrightness === 0 || (htmlBrightness && htmlBrightness < OPTIONS.basic.bgColorBrightnessThreshold) || bodyBrightness === 0 || (bodyBrightness && bodyBrightness < OPTIONS.basic.bgColorBrightnessThreshold)) {
      return false;
    }
    setStyle(body, "background-color", OPTIONS.basic.replaceBgWithColor);
    setStyle(body, "transition", "background-color .3s ease");
    // 这边稍微有点区别，非深色模式时无论body的背景色深浅代码都会遍历DOM树来检查是否有需要变色的元素
    // 但是在深色模式下仅Google就会存在误判的情况，所以想了想还是直接全部跳过了，这样可能会有漏网之鱼但是逻辑最简单
    Array.from(body.children).forEach(replaceColor);
    observer.observe(body, observerConfig);
  }
}

// benchmark
const benchmark = new Benchmark();
// 保存域名
const host = getHost(document.location.href);
// 设置改变时重新读取设置
chrome.storage.onChanged.addListener(init);
// 检查浏览器是否开启了Night Mode
const { matches: isNightMode } = window.matchMedia("(prefers-color-scheme: dark)");
// GO
init();

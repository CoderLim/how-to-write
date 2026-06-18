// app.js

// hanzi-writer 检测到 global.Path2D 存在时会用 new Path2D(svgPath)，
// 但微信小程序 type="2d" canvas 的 Path2D 与浏览器 Path2D 不兼容，导致笔划不显示。
// 在此清除，强制 hanzi-writer 走直接 canvas 绘制路径（moveTo/lineTo/bezierCurveTo）。
try {
  // globalThis 是 WeChat JS 引擎中的全局对象（同 global / this）
  Object.defineProperty(globalThis, 'Path2D', {
    value: undefined,
    writable: true,
    configurable: true,
  });
} catch (e) {
  try { globalThis.Path2D = undefined; } catch (e2) { /* ignore */ }
}

App({})

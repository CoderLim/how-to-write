// app.js

// hanzi-writer 检测到全局 Path2D 时会用 new Path2D(svgPath)，
// 但微信小程序要求用 canvas.createPath2D()，两者不兼容导致笔划不显示。
// 清除全局 Path2D，让 hanzi-writer 走直接 canvas 绘制路径（兼容微信 canvas）。
try {
  // eslint-disable-next-line no-undef
  if (typeof Path2D !== 'undefined') {
    global.Path2D = undefined;
  }
} catch (e) { /* ignore */ }

App({})

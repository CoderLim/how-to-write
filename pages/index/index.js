// pages/index/index.js
var HanziWriter = require('hanzi-writer');
var charFilter = require('../../utils/char-filter');

// Custom RenderTarget for WeChat miniprogram type="2d" canvas node
function MpRenderTarget(canvas) {
  this.node = canvas;
}

MpRenderTarget.prototype.getContext = function () {
  return this.node.getContext('2d');
};

MpRenderTarget.prototype.createSubRenderTarget = function () {
  // canvas renderer doesn't use sub-render targets; return self
  return this;
};

MpRenderTarget.prototype.addPointerStartListener = function () {};
MpRenderTarget.prototype.addPointerMoveListener = function () {};
MpRenderTarget.prototype.addPointerEndListener = function () {};
MpRenderTarget.prototype.removeAllListeners = function () {};

MpRenderTarget.init = function (canvas) {
  return new MpRenderTarget(canvas);
};

Page({
  data: {
    inputValue: '',
    chars: [],
    selectedChar: null,
    loading: false,
    animDone: false,
    errorMsg: '',
  },

  _writer: null,

  onInput: function (e) {
    var value = e.detail.value;
    var chars = charFilter.filterChinese(value);
    this.setData({
      inputValue: value,
      chars: chars,
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
    });
  },

  onSelectChar: function (e) {
    var char = e.currentTarget.dataset.char;
    this.setData({
      selectedChar: char,
      loading: true,
      animDone: false,
      errorMsg: '',
    });
    var self = this;
    wx.nextTick(function () {
      self._initWriter(char);
    });
  },

  onReplay: function () {
    if (!this.data.animDone || !this._writer) return;
    var self = this;
    this.setData({ animDone: false });
    this._writer.animateCharacter({
      onComplete: function () {
        self.setData({ animDone: true });
      },
    });
  },

  _initWriter: function (char) {
    if (this._writer) {
      this._writer.cancelAnimation();
      this._writer = null;
    }

    var self = this;
    var query = wx.createSelectorQuery().in(this);
    query
      .select('#hanzi-canvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) {
          self.setData({ loading: false, errorMsg: '画布初始化失败' });
          return;
        }

        var canvas = res[0].node;
        var dpr = wx.getWindowInfo().pixelRatio || 2;
        var size = 300;
        canvas.width = size * dpr;
        canvas.height = size * dpr;

        self._writer = HanziWriter.create(canvas, char, {
          width: size * dpr,
          height: size * dpr,
          padding: size * dpr * 0.05,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 300,
          renderer: 'canvas',
          rendererOverride: { createRenderTarget: MpRenderTarget.init },
          onLoadCharDataSuccess: function () {
            self.setData({ loading: false });
            self._writer.animateCharacter({
              onComplete: function () {
                self.setData({ animDone: true });
              },
            });
          },
          onLoadCharDataError: function () {
            self.setData({ loading: false, errorMsg: '暂不支持该字' });
          },
        });
      });
  },
});

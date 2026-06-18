// pages/index/index.js
var createHanziWriterContext = require('hanzi-writer-miniprogram');
var filterChinese = require('../../utils/char-filter').filterChinese;

Page({
  data: {
    inputValue: '',
    chars: [],
    selectedChar: null,
    loading: false,
    animDone: false,
    errorMsg: '',
  },

  _writerCtx: null,

  onInput: function(e) {
    var value = e.detail.value;
    var chars = filterChinese(value);
    this.setData({
      inputValue: value,
      chars: chars,
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
    });
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }
  },

  onSelectChar: function(e) {
    var char = e.currentTarget.dataset.char;
    this.setData({
      selectedChar: char,
      loading: true,
      animDone: false,
      errorMsg: '',
    });
    var self = this;
    wx.nextTick(function() {
      self._loadChar(char);
    });
  },

  onReplay: function() {
    if (!this.data.animDone || !this._writerCtx) return;
    var self = this;
    this.setData({ animDone: false });
    this._writerCtx.animateCharacter({
      onComplete: function() {
        self.setData({ animDone: true });
      },
    });
  },

  _loadChar: function(char) {
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }

    var self = this;
    try {
      var ctx = createHanziWriterContext({
        id: 'hanzi-writer',
        page: self,
        character: char,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataSuccess: function() {
          if (self._writerCtx !== ctx) return; // 已切换到其他字，丢弃
          self.setData({ loading: false });
          try {
            ctx.animateCharacter({
              onComplete: function() {
                if (self._writerCtx !== ctx) return;
                self.setData({ animDone: true });
              },
            });
          } catch(err) {
            self.setData({ errorMsg: '动画加载失败，请重试' });
          }
        },
        onLoadCharDataError: function() {
          if (self._writerCtx !== ctx) return;
          self.setData({ loading: false, errorMsg: '暂不支持该字' });
        },
      });
      self._writerCtx = ctx;
    } catch(err) {
      self.setData({ loading: false, errorMsg: '初始化失败，请重试' });
    }
  },
});

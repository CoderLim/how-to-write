// pages/index/index.js
var createHanziWriterContext = require('hanzi-writer-miniprogram');
var charFilter = require('../../utils/char-filter');

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
    var chars = charFilter.filterChinese(value);
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
      self._writerCtx = createHanziWriterContext({
        id: 'hanzi-writer',
        page: self,
        character: char,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        onLoadCharDataSuccess: function() {
          self.setData({ loading: false });
          self._writerCtx.animateCharacter({
            onComplete: function() {
              self.setData({ animDone: true });
            },
          });
        },
        onLoadCharDataError: function() {
          self.setData({ loading: false, errorMsg: '暂不支持该字' });
        },
      });
    } catch(err) {
      self.setData({ loading: false, errorMsg: '初始化失败，请重试' });
    }
  },
});

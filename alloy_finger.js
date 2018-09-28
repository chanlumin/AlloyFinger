/* AlloyFinger v0.1.15
 * By dntzhang
 * Github: https://github.com/AlloyTeam/AlloyFinger
 */
; (function () {
    // 获取向量的长度
    function getLen(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    // 点乘
    function dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
    // 获取两向量的夹角  a * b = cosa * |a| * |b|
    function getAngle(v1, v2) {
        var mr = getLen(v1) * getLen(v2);
        if (mr === 0) return 0;
        var r = dot(v1, v2) / mr;
        if (r > 1) r = 1;
        // Math.acos 获取的角度为弧度 => (0,2*Math.PI)
        return Math.acos(r);
    }

    // 获取向量夹角的方向  如果大于0右手法则 逆时针 <0 顺时针
    function cross(v1, v2) {
        return v1.x * v2.y - v2.x * v1.y;
    }
    // 获取两向量的夹角 单位为度
    function getRotateAngle(v1, v2) {
        var angle = getAngle(v1, v2);
        if (cross(v1, v2) > 0) {
            angle *= -1;
        }
        // (2*Math.PI/ 360)  * 角度  =  弧度
        return angle * 180 / Math.PI;
    }

    // 事件订阅器
    var HandlerAdmin = function(el) {
        this.handlers = [];
        this.el = el;
    };

    // 事件添加
    HandlerAdmin.prototype.add = function(handler) {
        this.handlers.push(handler);
    }

    // 事件删除 如果不传删除订阅器所有的事件
    HandlerAdmin.prototype.del = function(handler) {
        if(!handler) this.handlers = [];

        for(var i=this.handlers.length; i>=0; i--) {
            if(this.handlers[i] === handler) {
                this.handlers.splice(i, 1);
            }
        }
    }
    // 事件派发 遍历所有的事件,并执行
    HandlerAdmin.prototype.dispatch = function() {
        for(var i=0,len=this.handlers.length; i<len; i++) {
            var handler = this.handlers[i];
            if(typeof handler === 'function') handler.apply(this.el, arguments);
        }
    }

    // 给实例添加事件订阅器
    function wrapFunc(el, handler) {
        var handlerAdmin = new HandlerAdmin(el);
        handlerAdmin.add(handler);

        return handlerAdmin;
    }

    var AlloyFinger = function (el, option) {

        this.element = typeof el == 'string' ? document.querySelector(el) : el;
        
        console.log(this.start)
        // 绑定start move end cancel 到AlloyFinger的环境上下文中
        // 不绑定在start中this 代表的是element
        this.start = this.start.bind(this);
        this.move = this.move.bind(this);
        this.end = this.end.bind(this);
        this.cancel = this.cancel.bind(this);

        this.element.addEventListener("touchstart", this.start, false);
        this.element.addEventListener("touchmove", this.move, false);
        this.element.addEventListener("touchend", this.end, false);
        this.element.addEventListener("touchcancel", this.cancel, false);

        // 保存两个手指的坐标差
        this.preV = { x: null, y: null };
        // 双手捏合的开始的长度
        this.pinchStartLen = null;
        this.zoom = 1;
        this.isDoubleTap = false;

        var noop = function () { };

        // 给每一个手势添加一个事件监听器
        this.rotate = wrapFunc(this.element, option.rotate || noop);
        this.touchStart = wrapFunc(this.element, option.touchStart || noop);
        this.multipointStart = wrapFunc(this.element, option.multipointStart || noop);
        this.multipointEnd = wrapFunc(this.element, option.multipointEnd || noop);
        this.pinch = wrapFunc(this.element, option.pinch || noop);
        this.swipe = wrapFunc(this.element, option.swipe || noop);
        this.tap = wrapFunc(this.element, option.tap || noop);
        this.doubleTap = wrapFunc(this.element, option.doubleTap || noop);
        this.longTap = wrapFunc(this.element, option.longTap || noop);
        this.singleTap = wrapFunc(this.element, option.singleTap || noop);
        this.pressMove = wrapFunc(this.element, option.pressMove || noop);
        this.twoFingerPressMove = wrapFunc(this.element, option.twoFingerPressMove || noop);
        this.touchMove = wrapFunc(this.element, option.touchMove || noop);
        this.touchEnd = wrapFunc(this.element, option.touchEnd || noop);
        this.touchCancel = wrapFunc(this.element, option.touchCancel || noop);

        this._cancelAllHandler = this.cancelAll.bind(this);

        window.addEventListener('scroll', this._cancelAllHandler);

        this.delta = null;
        this.last = null;
        this.now = null;
        this.tapTimeout = null;
        this.singleTapTimeout = null;
        this.longTapTimeout = null;
        this.swipeTimeout = null;
        // x1, y1, start开始时的坐标   x2, y2 move时候的坐标
        this.x1 = this.x2 = this.y1 = this.y2 = null; 
        this.preTapPosition = { x: null, y: null };
    };

    AlloyFinger.prototype = {
        start: function (evt) {
            console.log(this)
            if (!evt.touches) return;
            this.now = Date.now();
            this.x1 = evt.touches[0].pageX;
            this.y1 = evt.touches[0].pageY;
            this.delta = this.now - (this.last || this.now);
            console.log(this.delta, this.now, this.last, this.x1, this.y1)
            // 派发touchStart事件
            this.touchStart.dispatch(evt, this.element);
            if (this.preTapPosition.x !== null) {
                // 两次点击的时间>0 小于250的 并且两次触摸点的x轴,y轴的距离了都 小于30px 为双击
                this.isDoubleTap = (this.delta > 0 && this.delta <= 250 && Math.abs(this.preTapPosition.x - this.x1) < 30 && Math.abs(this.preTapPosition.y - this.y1) < 30);
                if (this.isDoubleTap) clearTimeout(this.singleTapTimeout);
            }
            // 第一次点击的坐标
            this.preTapPosition.x = this.x1;
            this.preTapPosition.y = this.y1;
            this.last = this.now;
            var preV = this.preV,
                len = evt.touches.length;
            // 多个手指
            if (len > 1) {
                // 清除长按 和一次点击的定时器
                this._cancelLongTap();
                this._cancelSingleTap();
                console.log(evt.touches[1])
                var v = { x: evt.touches[1].pageX - this.x1, y: evt.touches[1].pageY - this.y1 };
                preV.x = v.x;
                preV.y = v.y;
                this.pinchStartLen = getLen(preV);
                // 派发多点触摸事件
                this.multipointStart.dispatch(evt, this.element);
            }
            // 默认没有阻止点击事件
            this._preventTap = false;
            this.longTapTimeout = setTimeout(function () {
                // 750 毫秒之内, 如果没有清楚定时器,就触发长按事件 同时阻止默认的点击事件
                this.longTap.dispatch(evt, this.element);
                this._preventTap = true;
            }.bind(this), 750);
        },
        move: function (evt) {
            // console.log(evt.touches)
            if (!evt.touches) return;
            var preV = this.preV,
                len = evt.touches.length,
                currentX = evt.touches[0].pageX,
                currentY = evt.touches[0].pageY;
            // 有移动动作把doubleTap置为false
            this.isDoubleTap = false;
            // 多根手指
            if (len > 1) {
                var sCurrentX = evt.touches[1].pageX,
                    sCurrentY = evt.touches[1].pageY
                // 捏合的向量
                var v = { x: evt.touches[1].pageX - currentX, y: evt.touches[1].pageY - currentY };
                // start时候记录的双指存在啊
                if (preV.x !== null) {
                    if (this.pinchStartLen > 0) {
                        // 计算捏合的大小比例
                        evt.zoom = getLen(v) / this.pinchStartLen;
                        this.pinch.dispatch(evt, this.element);
                    }
                    // 两个手指 不是捏合就是旋转
                    evt.angle = getRotateAngle(v, preV);
                    this.rotate.dispatch(evt, this.element);
                }
                // 记录move时的差值坐标
                preV.x = v.x;
                preV.y = v.y;

                // 两根手指的话移动的记录为两个手指移动的差值的平均值
                if (this.x2 !== null && this.sx2 !== null) {
                    evt.deltaX = (currentX - this.x2 + sCurrentX - this.sx2) / 2;
                    evt.deltaY = (currentY - this.y2 + sCurrentY - this.sy2) / 2;
                } else {
                    evt.deltaX = 0;
                    evt.deltaY = 0;
                }
                // 两根手指按移动
                this.twoFingerPressMove.dispatch(evt, this.element);
                // 第二根手指的x,y值坐标
                this.sx2 = sCurrentX;
                this.sy2 = sCurrentY;
            } else {
                // 单根手指 计算移动的差值
                if (this.x2 !== null) {
                    evt.deltaX = currentX - this.x2;
                    evt.deltaY = currentY - this.y2;

                    //move事件中添加对当前触摸点到初始触摸点的判断，
                    //如果曾经大于过某个距离(比如10),就认为是移动到某个地方又移回来，应该不再触发tap事件才对。
                    var movedX = Math.abs(this.x1 - this.x2),
                        movedY = Math.abs(this.y1 - this.y2);

                    if(movedX > 10 || movedY > 10){
                        this._preventTap = true;
                    }

                } else {
                    // 初始的时候 deltaX好deltaY为0
                    evt.deltaX = 0;
                    evt.deltaY = 0;
                }
                
                // 派发单根手指的按压事件
                this.pressMove.dispatch(evt, this.element);
            }
            // 派发touchMove事件
            this.touchMove.dispatch(evt, this.element);

            this._cancelLongTap();
            this.x2 = currentX;
            this.y2 = currentY;
            
            if (len > 1) {
                evt.preventDefault();
            }
        },
        end: function (evt) {
            if (!evt.changedTouches) return;
            // 到这里还没有750ms的话 清除长按的定时器 
            this._cancelLongTap();
            var self = this;
            // evt.touches[0] evt.touches[1] 
            if (evt.touches.length < 2) {
                this.multipointEnd.dispatch(evt, this.element);
                this.sx2 = this.sy2 = null;
            }

            //swipe x轴或者y轴移动的距离大于30的话 才是左滑动或者右滑动
            if ((this.x2 && Math.abs(this.x1 - this.x2) > 30) ||
                (this.y2 && Math.abs(this.y1 - this.y2) > 30)) {
                evt.direction = this._swipeDirection(this.x1, this.x2, this.y1, this.y2);
                this.swipeTimeout = setTimeout(function () {
                    self.swipe.dispatch(evt, self.element);

                }, 0)
            } else {
                this.tapTimeout = setTimeout(function () {
                    if(!self._preventTap){
                        self.tap.dispatch(evt, self.element);
                    }
                    // trigger double tap immediately
                    if (self.isDoubleTap) {
                        self.doubleTap.dispatch(evt, self.element);
                        self.isDoubleTap = false;
                    }
                }, 0)

                if (!self.isDoubleTap) {
                    self.singleTapTimeout = setTimeout(function () {
                        self.singleTap.dispatch(evt, self.element);
                    }, 250);
                }
            }

            this.touchEnd.dispatch(evt, this.element);

            // 滑动结束 重置初始状态
            this.preV.x = 0;
            this.preV.y = 0;
            this.zoom = 1;
            this.pinchStartLen = null;
            this.x1 = this.x2 = this.y1 = this.y2 = null;
        },
        cancelAll: function () {
            this._preventTap = true
            clearTimeout(this.singleTapTimeout);
            clearTimeout(this.tapTimeout);
            clearTimeout(this.longTapTimeout);
            clearTimeout(this.swipeTimeout);
        },
        cancel: function (evt) {
            this.cancelAll()
            this.touchCancel.dispatch(evt, this.element);
        },
        _cancelLongTap: function () {
            clearTimeout(this.longTapTimeout);
        },
        _cancelSingleTap: function () {
            clearTimeout(this.singleTapTimeout);
        },
        _swipeDirection: function (x1, x2, y1, y2) {
            return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
        },

        on: function(evt, handler) {
            if(this[evt]) {
                this[evt].add(handler);
            }
        },

        off: function(evt, handler) {
            if(this[evt]) {
                this[evt].del(handler);
            }
        },
        /**
         * 注销所有的事件和初始化所有的值
         */
        destroy: function() {
            if(this.singleTapTimeout) clearTimeout(this.singleTapTimeout);
            if(this.tapTimeout) clearTimeout(this.tapTimeout);
            if(this.longTapTimeout) clearTimeout(this.longTapTimeout);
            if(this.swipeTimeout) clearTimeout(this.swipeTimeout);

            this.element.removeEventListener("touchstart", this.start);
            this.element.removeEventListener("touchmove", this.move);
            this.element.removeEventListener("touchend", this.end);
            this.element.removeEventListener("touchcancel", this.cancel);

            this.rotate.del();
            this.touchStart.del();
            this.multipointStart.del();
            this.multipointEnd.del();
            this.pinch.del();
            this.swipe.del();
            this.tap.del();
            this.doubleTap.del();
            this.longTap.del();
            this.singleTap.del();
            this.pressMove.del();
            this.twoFingerPressMove.del()
            this.touchMove.del();
            this.touchEnd.del();
            this.touchCancel.del();

            this.preV = this.pinchStartLen = this.zoom = this.isDoubleTap = this.delta = this.last = this.now = this.tapTimeout = this.singleTapTimeout = this.longTapTimeout = this.swipeTimeout = this.x1 = this.x2 = this.y1 = this.y2 = this.preTapPosition = this.rotate = this.touchStart = this.multipointStart = this.multipointEnd = this.pinch = this.swipe = this.tap = this.doubleTap = this.longTap = this.singleTap = this.pressMove = this.touchMove = this.touchEnd = this.touchCancel = this.twoFingerPressMove = null;

            window.removeEventListener('scroll', this._cancelAllHandler);
            return null;
        }
    };

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = AlloyFinger;
    } else {
        window.AlloyFinger = AlloyFinger;
    }
})();

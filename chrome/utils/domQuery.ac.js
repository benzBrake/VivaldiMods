// ==UserScript==
// @name            DOM Query Helper
// @description     Vivaldi UI 轻量 DOM 查询与事件辅助工具
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         1.0.0
// @charset         UTF-8
// ==/UserScript==
(() => {
    if (window.$ && window.$.__userChromeDomQuery) {
        return;
    }

    const delegatedEventListeners = new WeakMap();

    function addDelegatedEventListener(element, event, selector, handler, listener) {
        const listeners = delegatedEventListeners.get(element) || [];
        listeners.push({ event, selector, handler, listener });
        delegatedEventListeners.set(element, listeners);
    }

    function removeDelegatedEventListeners(element, event, selector, handler) {
        const listeners = delegatedEventListeners.get(element) || [];
        const remainingListeners = [];

        listeners.forEach(function (listenerInfo) {
            if (listenerInfo.event === event && listenerInfo.selector === selector && listenerInfo.handler === handler) {
                element.removeEventListener(event, listenerInfo.listener);
            } else {
                remainingListeners.push(listenerInfo);
            }
        });

        if (remainingListeners.length) {
            delegatedEventListeners.set(element, remainingListeners);
        } else {
            delegatedEventListeners.delete(element);
        }
    }

    function $(selector, context) {
        context = context || document;
        this.elements = [];
        if (typeof selector === 'string') {
            if (selector === 'document') {
                this.elements = [document];
            } else {
                this.elements = [...context.querySelectorAll(selector)];
            }
        } else if (selector instanceof Document) {
            this.elements = [selector];
        } else if (selector instanceof HTMLElement) {
            this.elements = [selector];
        }

        Object.defineProperty(this, 'length', {
            get: function () {
                return this.elements.length;
            },
            configurable: true
        });

        const handler = {
            get: function (target, prop) {
                if (typeof prop === 'string' && !isNaN(prop)) {
                    return target.elements[prop];
                }
                return target[prop];
            }
        };

        return new Proxy(this, handler);
    }

    $.prototype.each = function (callback) {
        this.elements.forEach(function (el, index) {
            callback.call(el, index, el);
        });
        return this;
    };

    $.prototype.find = function (selector) {
        const results = [];
        this.each(function () {
            results.push(...this.querySelectorAll(selector));
        });
        this.elements = results;
        return this;
    };

    $.prototype.closest = function (selector) {
        const closestElements = [];
        this.each(function () {
            let current = this;
            while (current) {
                if (current.matches(selector)) {
                    closestElements.push(current);
                    break;
                }
                current = current.parentElement;
            }
        });
        const obj = new $();
        obj.elements = closestElements;
        return obj;
    };

    $.prototype.hasClass = function (className) {
        let hasClass = false;
        this.each(function () {
            if (this.classList.contains(className)) {
                hasClass = true;
            }
        });
        return hasClass;
    };

    $.prototype.addClass = function (className) {
        return this.each(function () {
            this.classList.add(className);
        });
    };

    $.prototype.removeClass = function (className) {
        return this.each(function () {
            this.classList.remove(className);
        });
    };

    $.prototype.toggleClass = function (className) {
        return this.each(function () {
            this.classList.toggle(className);
        });
    };

    $.prototype.on = function (event, selectorOrHandler, handler) {
        if (typeof selectorOrHandler === 'string' && typeof handler === 'function') {
            return this.each(function () {
                const element = this;
                const delegatedHandler = function (e) {
                    const potentialElements = this.querySelectorAll(selectorOrHandler);
                    let target = e.target;
                    while (target && target !== this) {
                        if ([...potentialElements].includes(target)) {
                            handler.call(target, e);
                            break;
                        }
                        target = target.parentNode;
                    }
                };
                element.addEventListener(event, delegatedHandler);
                addDelegatedEventListener(element, event, selectorOrHandler, handler, delegatedHandler);
            });
        }

        if (typeof selectorOrHandler === 'function') {
            return this.each(function () {
                this.addEventListener(event, selectorOrHandler);
            });
        }

        throw new TypeError('Handler must be a function');
    };

    $.prototype.off = function (event, selectorOrHandler, handler) {
        return this.each(function () {
            const element = this;

            if (!event) {
                const clone = element.cloneNode(true);
                element.parentNode.replaceChild(clone, element);
                return;
            }

            if (typeof selectorOrHandler === 'string' && typeof handler === 'function') {
                removeDelegatedEventListeners(element, event, selectorOrHandler, handler);
            } else if (typeof selectorOrHandler === 'function') {
                element.removeEventListener(event, selectorOrHandler);
            } else {
                throw new TypeError('Handler must be a function');
            }
        });
    };

    $.prototype.trigger = function (eventName, detail) {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
            detail: detail
        });
        return this.each(function () {
            this.dispatchEvent(event);
        });
    };

    $.prototype.get = function (index) {
        return this.elements[index];
    };

    window.$ = function (selector, context) {
        return new $(selector, context);
    };

    Object.defineProperty(window.$, '__userChromeDomQuery', {
        value: true,
        configurable: false,
        enumerable: false
    });
})();

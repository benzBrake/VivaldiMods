// ==UserScript==
// @name            activateTabOnHover.uc.js
// @description     激活鼠标指向标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         0.0.1
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/master/userChromeJS
// ==/UserScript==
(function activateTab(tabContainer, delay = 200, wait) {
  function hover(e, tab) {
    if (
      !tab.classList.contains("active") &&
      !e.shiftKey &&
      !e.ctrlKey
    ) {
      tab.addEventListener("mouseleave", function () {
        clearTimeout(wait);
        tab.removeEventListener("mouseleave", tab);
      });
      wait = setTimeout(function () {
        const id = Number(tab.id.replace(/^\D+/g, ""));
        chrome.tabs.update(id, { active: true, highlighted: true });
      }, delay);
    }
  }

  // 绑定事件
  function bindEvent(tabContainer) {
    tabContainer.addEventListener("mouseover", (event) => {
      let tab = event.target.closest('.tab');
      if (tab) {
        hover(event, tab);
      }
    });
  }

  bindEvent(tabContainer);

  // 调整标签位置后重新绑定事件
  let appendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function () {
    if (
      arguments[0].tagName === "DIV" &&
      arguments[0].classList.contains("tabbar-wrapper")
    ) {
      bindEvent(arguments[0].querySelector('#tabs-container .tab-strip'));
    }
    return appendChild.apply(this, arguments);
  };
})(document.querySelector('#tabs-container .tab-strip'), 150);

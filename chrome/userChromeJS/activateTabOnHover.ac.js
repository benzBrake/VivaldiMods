// ==UserScript==
// @name            activateTabOnHover.uc.js
// @description     激活鼠标指向标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20240309
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            源自 https://forum.vivaldi.net/post/395460，修改兼容标签分组
// ==/UserScript==
(function activateTab() {
  let activateTabForGroups = {}; // 不知道怎么从 Vivaldi 获取当前标签分组最后激活的标签就记录起来
  async function swithToTab(id) {
    let tabs = await chrome.tabs.query({ currentWindow: true });
    tabs = tabs.filter((tab) => tab.id === id);
    if (tabs.length > 0) {
      let { vivExtData } = tabs[0];
      let extDataObj = JSON.parse(vivExtData);
      if ("group" in extDataObj) {
        // 记录当前标签分组最后激活的标签
        activateTabForGroups[extDataObj.group] = id;
      }
      chrome.tabs.update(id, { active: true });
    }
  }
  function hover(e, tab) {
    if (
      !tab.parentNode.classList.contains("active") &&
      !e.shiftKey &&
      !e.ctrlKey
    ) {
      tab.addEventListener("mouseleave", function () {
        clearTimeout(wait);
        tab.removeEventListener("mouseleave", tab);
      });
      wait = setTimeout(async function () {
        if (tab.parentNode.parentNode.classList.contains("is-substack")) {
          // 指向的是标签分组
          const groupId = tab.parentNode.id.replace(/^tab-/g, "");
          let tabs = await chrome.tabs.query({ currentWindow: true });
          tabs = tabs.filter(t => {
            return JSON.parse(t.vivExtData).group == groupId;
          });
          if (tabs.length === 0) return;
          if (groupId in activateTabForGroups) {
            const filteredTabs = tabs.filter(t => {
              return t.id === activateTabForGroups[groupId];
            });
            if (filteredTabs.length > 0) {
              // 最后激活的标签还在
              swithToTab(activateTabForGroups[groupId]);
            } else {
              // 最后激活的标签不在了，那就激活该分组第一个标签
              swithToTab(tabs[0].id);
            }
          } else {
            // 当前分组没有激活过的标签，就激活第一个
            swithToTab(tabs[0].id);
          }
        } else {
          // 指向的是普通标签
          const id = Number(tab.parentNode.id.replace(/^\D+/g, ""));
          swithToTab(id);
        }
      }, delay);
    }
  }

  let wait;
  const delay = 300; //pick a time in milliseconds

  // 脚本加载时部分标签已经存在
  document.querySelectorAll('div.tab-header').forEach((e) => {
    e.addEventListener("mouseover", function (event) { hover(event, e) });
  });

  let appendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function () {
    if (
      arguments[0].tagName === "DIV" &&
      arguments[0].classList.contains("tab-header")
    ) {
      setTimeout(
        function () {
          const trigger = (event) => hover(event, arguments[0]);
          arguments[0].addEventListener("mouseenter", trigger);
        }.bind(this, arguments[0])
      );
    }
    return appendChild.apply(this, arguments);
  };
})();
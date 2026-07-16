// ==UserScript==
// @name            activateTabOnHover.ac.js
// @description     激活鼠标指向标签页
// @license         MIT License
// @compatibility   Vivaldi 8
// @version         20260716
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20241023 跟随 userChrome.js 更新
// @note            源自 https://forum.vivaldi.net/post/395460，修改兼容标签分组
// @note            20260716 使用标签条事件委托，兼容垂直标签栏
// ==/UserScript==
(function () {
  const activateTabForGroups = {}; // 不知道怎么从 Vivaldi 获取当前标签分组最后激活的标签就记录起来
  const delay = 300; // pick a time in milliseconds
  let wait;
  let hoveredTab;

  function getTabGroupId (tab) {
    try {
      const extData = JSON.parse(tab.vivExtData || "{}");
      return extData.group;
    } catch (error) {
      return undefined;
    }
  }

  async function switchToTab (id) {
    let tabs = await chrome.tabs.query({ currentWindow: true });
    tabs = tabs.filter((tab) => tab.id === id);
    if (tabs.length > 0) {
      const groupId = getTabGroupId(tabs[0]);
      if (groupId) {
        // 记录当前标签分组最后激活的标签
        activateTabForGroups[groupId] = id;
      }
      await chrome.tabs.update(id, { active: true, highlighted: true });
    }
  }

  function isActiveTab (tab) {
    return tab.getAttribute("aria-selected") === "true" ||
      tab.classList.contains("active") ||
      tab.closest(".tab-position")?.classList.contains("active");
  }

  function clearPendingActivation (tab) {
    if (tab && hoveredTab !== tab) return;
    clearTimeout(wait);
    wait = undefined;
    hoveredTab = undefined;
  }

  function onHover (e) {
    const tab = e.target.closest('[role="tab"]');
    if (!tab || tab === hoveredTab || (e.relatedTarget && tab.contains(e.relatedTarget))) return;
    clearPendingActivation();
    if (
      !isActiveTab(tab) &&
      !e.shiftKey &&
      !e.ctrlKey
    ) {
      hoveredTab = tab;
      wait = setTimeout(async function () {
        try {
          if (hoveredTab !== tab || !tab.matches(":hover")) return;
          if (tab.closest('.tab-position')?.classList.contains("is-substack")) {
            // 指向的是标签分组
            const groupId = tab.id.replace(/^tab-/g, "");
            let tabs = await chrome.tabs.query({ currentWindow: true });
            tabs = tabs.filter(t => {
              return getTabGroupId(t) === groupId;
            });
            if (tabs.length === 0 || hoveredTab !== tab) return;
            if (groupId in activateTabForGroups) {
              const filteredTabs = tabs.filter(t => {
                return t.id === activateTabForGroups[groupId];
              });
              if (filteredTabs.length > 0) {
                // 最后激活的标签还在
                await switchToTab(activateTabForGroups[groupId]);
              } else {
                // 最后激活的标签不在了，那就激活该分组第一个标签
                await switchToTab(tabs[0].id);
              }
            } else {
              // 当前分组没有激活过的标签，就激活第一个
              await switchToTab(tabs[0].id);
            }
          } else {
            // 指向的是普通标签
            const id = Number(tab.id.replace(/^\D+/g, ""));
            await switchToTab(id);
          }
        } finally {
          if (hoveredTab === tab) {
            clearPendingActivation(tab);
          }
        }
      }, delay);
    }
  }

  function onMouseOut (e) {
    const tab = e.target.closest('[role="tab"]');
    if (!tab || (e.relatedTarget && tab.contains(e.relatedTarget))) return;
    clearPendingActivation(tab);
  }

  function bindTabStrip (tabStrip) {
    if (!tabStrip || tabStrip.dataset.activateTabOnHoverBound) return;
    tabStrip.dataset.activateTabOnHoverBound = "true";
    tabStrip.addEventListener("mouseover", onHover);
    tabStrip.addEventListener("mouseout", onMouseOut);
  }

  function bindTabStrips (root) {
    if (root.matches?.(".tab-strip")) {
      bindTabStrip(root);
    }
    root.querySelectorAll?.(".tab-strip").forEach(bindTabStrip);
  }

  // 在标签条上使用事件委托，兼容 Vivaldi 8 垂直标签栏与后续动态插入的标签。
  bindTabStrips(document);

  // 调整标签位置时，Vivaldi 会重新创建标签条。
  userChrome_js.observeAddedNodes(function (insertElement) {
    if (!insertElement || insertElement.nodeType !== Node.ELEMENT_NODE) return;
    bindTabStrips(insertElement);
  });
})();

// ==UserScript==
// @name            activateTabOnHover.ac.js
// @description     激活鼠标指向标签页
// @license         MIT License
// @compatibility   Vivaldi 8
// @version         20260813
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20241023 跟随 userChrome.js 更新
// @note            源自 https://forum.vivaldi.net/post/395460，修改兼容标签分组
// @note            20260716 使用标签条事件委托，兼容垂直标签栏
// @note            20260813 兼容精简版标签堆叠 DOM、悬停开关以及 tooltip 悬停激活，修复异步切换竞态
// ==/UserScript==
(function () {
  // 是否在悬停精简标签堆叠内的 div.tab 时，切换到该堆叠最后访问的标签页。
  const activateLastVisitedTabOnCompactStackHover = false;
  const debug = false;
  const activateTabForGroups = {}; // 不知道怎么从 Vivaldi 获取当前标签分组最后激活的标签就记录起来
  const delay = 300; // pick a time in milliseconds
  let wait;
  let hoveredTab;
  let tooltipSource;

  function getTabGroupId (tab) {
    try {
      const extData = JSON.parse(tab.vivExtData || "{}");
      return extData.group;
    } catch (error) {
      return undefined;
    }
  }

  function debugLog (...args) {
    if (debug) console.info("activateTabOnHover:", ...args);
  }

  async function switchToTab (id, canActivate = () => true) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tab = tabs.find(tab => tab.id === id);
    if (!tab || !canActivate()) return false;

    const groupId = getTabGroupId(tab);
    if (groupId) {
      // 记录当前标签分组最后激活的标签
      activateTabForGroups[groupId] = id;
    }
    await chrome.tabs.update(id, { active: true, highlighted: true });
    return true;
  }

  function isActiveTab (tab) {
    return tab.getAttribute("aria-selected") === "true" ||
      tab.classList.contains("active") ||
      tab.closest(".tab-position")?.classList.contains("active");
  }

  function getStackId (tab) {
    const rawId = tab.getAttribute("data-id") || tab.id || "";
    return rawId.replace(/^tab-/, "");
  }

  function getRegularTabId (tab) {
    const rawId = tab.getAttribute("data-id") || tab.id || "";
    const numericId = rawId.match(/(\d+)$/);
    return numericId ? Number(numericId[1]) : NaN;
  }

  function isStackTab (tab) {
    return tab.querySelector(".tab.tab-group") !== null ||
      tab.classList.contains("tab-group") ||
      tab.closest(".tab-position")?.classList.contains("is-substack") ||
      !!tab.querySelector(".tab-group-indicator > .tab-indicator");
  }

  function rememberTooltipSource (tab) {
    if (isStackTab(tab)) {
      tooltipSource = { groupId: getStackId(tab) };
      return;
    }

    const tabId = getRegularTabId(tab);
    tooltipSource = Number.isNaN(tabId) ? undefined : { tabId: tabId };
  }

  function getHoverContext (target) {
    const indicator = target.closest?.(".tab-group-indicator > .tab-indicator");
    if (indicator) {
      // indicator 保留 Vivaldi 原生切换行为，不受精简堆叠 div.tab 的开关控制。
      return {
        tab: indicator.closest('[role="tab"]'),
        indicator: indicator,
        compactStackTab: null
      };
    }

    const tab = target.closest?.('[role="tab"]');
    const compactStackTab = target.closest?.("div.tab");
    if (
      tab &&
      compactStackTab &&
      tab.contains(compactStackTab) &&
      tab.querySelector(".tab-group-indicator")
    ) {
      return {
        tab: tab,
        indicator: null,
        compactStackTab: compactStackTab
      };
    }

    return {
      tab: tab,
      indicator: null,
      compactStackTab: null
    };
  }

  async function switchToLastVisitedTabInStack (tab, hoverTarget) {
    const groupId = getStackId(tab);
    if (!groupId) return;

    let tabs = await chrome.tabs.query({ currentWindow: true });
    tabs = tabs.filter(t => getTabGroupId(t) === groupId);
    if (tabs.length === 0 || hoveredTab !== hoverTarget) return;

    const lastVisitedTab = tabs.find(t => t.id === activateTabForGroups[groupId]);
    await switchToTab(
      lastVisitedTab ? lastVisitedTab.id : tabs[0].id,
      () => hoveredTab === hoverTarget && hoverTarget.matches(":hover")
    );
  }

  function clearPendingActivation (tab) {
    if (tab && hoveredTab !== tab) return;
    clearTimeout(wait);
    wait = undefined;
    hoveredTab = undefined;
  }

  function onHover (e) {
    const context = getHoverContext(e.target);
    const tab = context.tab;
    const indicator = context.indicator;
    const compactStackTab = context.compactStackTab;
    const hoverTarget = indicator || compactStackTab || tab;
    if (!tab) return;
    rememberTooltipSource(tab);
    if (hoverTarget === hoveredTab || (e.relatedTarget && hoverTarget.contains(e.relatedTarget))) return;
    clearPendingActivation();
    if (compactStackTab && !activateLastVisitedTabOnCompactStackHover) return;
    if (
      (indicator || !isActiveTab(tab)) &&
      !e.shiftKey &&
      !e.ctrlKey
    ) {
      hoveredTab = hoverTarget;
      wait = setTimeout(async function () {
        try {
          if (hoveredTab !== hoverTarget || !hoverTarget.matches(":hover")) return;
          if (indicator) {
            // indicator 自带 Vivaldi 原生切换逻辑，直接复用其点击行为。
            indicator.click();
            return;
          }
          if (compactStackTab) {
            await switchToLastVisitedTabInStack(tab, hoverTarget);
            return;
          }
          if (isStackTab(tab)) {
            // 指向的是标签分组
            await switchToLastVisitedTabInStack(tab, hoverTarget);
          } else {
            // 指向的是普通标签
            const id = getRegularTabId(tab);
            if (!Number.isNaN(id)) {
              await switchToTab(
                id,
                () => hoveredTab === hoverTarget && hoverTarget.matches(":hover")
              );
            }
          }
        } finally {
          if (hoveredTab === hoverTarget) {
            clearPendingActivation(hoverTarget);
          }
        }
      }, delay);
    }
  }

  function onMouseOut (e) {
    const context = getHoverContext(e.target);
    const hoverTarget = context.indicator || context.compactStackTab || context.tab;
    if (!hoverTarget || (e.relatedTarget && hoverTarget.contains(e.relatedTarget))) return;
    clearPendingActivation(hoverTarget);
  }

  function getTooltipItem (target) {
    return target.closest?.("#vivaldi-tooltip .tooltip-item");
  }

  function toTabId (value) {
    if (value === undefined || value === null || value === "") return undefined;
    const id = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(id) && id >= 0 ? id : undefined;
  }

  function getTabIdFromReactFiber (item) {
    const elements = [item, ...item.querySelectorAll("*")];
    for (const element of elements) {
      const reactKeys = Object.getOwnPropertyNames(element).filter(key =>
        key.startsWith("__reactFiber$") ||
        key.startsWith("__reactInternalInstance$") ||
        key.startsWith("__reactProps$")
      );
      for (const reactKey of reactKeys) {
        let node = element[reactKey];
        for (let depth = 0; node && depth < 8; depth++, node = node.return) {
          const candidates = [
            node.pageId,
            node.memoizedProps?.pageId,
            node.pendingProps?.pageId,
            node.key
          ];
          for (const candidate of candidates) {
            const tabId = toTabId(candidate);
            if (tabId !== undefined) return tabId;
          }
        }
      }
    }
    return undefined;
  }

  async function resolveTooltipTabId (item) {
    const isGroupTooltip = !!item.closest(".tab-group");
    const sourceGroupId = tooltipSource?.groupId;
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const fiberTabId = getTabIdFromReactFiber(item);

    if (fiberTabId !== undefined) {
      const fiberTab = tabs.find(tab => tab.id === fiberTabId);
      if (
        fiberTab &&
        (isGroupTooltip
          ? sourceGroupId && getTabGroupId(fiberTab) === sourceGroupId
          : tooltipSource?.tabId === undefined ||
            fiberTabId === tooltipSource.tabId)
      ) return { tabId: fiberTabId, strategy: "fiber-tab-id" };
    }

    if (!isGroupTooltip && tooltipSource?.tabId !== undefined) {
      const sourceTab = tabs.find(tab => tab.id === tooltipSource.tabId);
      if (sourceTab) {
        return { tabId: sourceTab.id, strategy: "source-tab-id" };
      }
    }

    if (isGroupTooltip && sourceGroupId) {
      const items = [...item.closest(".tab-group").querySelectorAll(".tooltip-item")];
      const groupTabs = tabs
        .filter(tab => getTabGroupId(tab) === sourceGroupId)
        .sort((left, right) => left.index - right.index);
      const itemIndex = items.indexOf(item);
      if (items.length === groupTabs.length && itemIndex >= 0) {
        return {
          tabId: groupTabs[itemIndex].id,
          strategy: "group-order-id"
        };
      }
    }
    return undefined;
  }

  function canActivateTooltipItem (item) {
    return hoveredTab === item &&
      item.matches(":hover") &&
      !item.querySelector(".close:hover");
  }

  async function activateTooltipItem (item) {
    let resolution;
    try {
      resolution = await resolveTooltipTabId(item);
      if (resolution && canActivateTooltipItem(item)) {
        if (await switchToTab(resolution.tabId, () => canActivateTooltipItem(item))) {
          debugLog("tooltip activation", resolution);
          return;
        }
      }
    } catch (error) {
      console.warn("activateTabOnHover: chrome.tabs tooltip activation failed.", error);
    }

    // 保留兼容回退；原生点击会关闭 tooltip。
    if (canActivateTooltipItem(item)) {
      debugLog("tooltip activation", {
        strategy: "simulated-click",
        resolvedTabId: resolution?.tabId,
        resolvedStrategy: resolution?.strategy
      });
      item.click();
    }
  }

  function onTooltipHover (e) {
    const item = getTooltipItem(e.target);
    if (!item) return;

    // 进入关闭按钮时取消待激活，避免关闭后台标签前先切换到该标签。
    if (e.target.closest?.(".close")) {
      clearPendingActivation(item);
      return;
    }
    if (
      item === hoveredTab ||
      (e.relatedTarget &&
        item.contains(e.relatedTarget) &&
        !e.relatedTarget.closest?.(".close"))
    ) return;

    clearPendingActivation();
    if (e.shiftKey || e.ctrlKey) return;

    hoveredTab = item;
    debugLog("tooltip hover scheduled", {
      active: item.classList.contains("active"),
      lastActive: item.classList.contains("last-active")
    });
    wait = setTimeout(async function () {
      try {
        if (!canActivateTooltipItem(item)) {
          debugLog("tooltip hover cancelled", {
            sameItem: hoveredTab === item,
            hovered: item.matches(":hover"),
            closeHovered: !!item.querySelector(".close:hover")
          });
          return;
        }
        await activateTooltipItem(item);
      } finally {
        if (hoveredTab === item) {
          clearPendingActivation(item);
        }
      }
    }, delay);
  }

  function onTooltipMouseOut (e) {
    const item = getTooltipItem(e.target);
    if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
    clearPendingActivation(item);
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

  // tooltip 会动态创建，委托到 document 可避免重复绑定和观察其生命周期。
  document.addEventListener("mouseover", onTooltipHover, true);
  document.addEventListener("mouseout", onTooltipMouseOut, true);

  // 调整标签位置时，Vivaldi 会重新创建标签条。
  userChrome_js.observeAddedNodes(function (insertElement) {
    if (!insertElement || insertElement.nodeType !== Node.ELEMENT_NODE) return;
    bindTabStrips(insertElement);
  });
})();

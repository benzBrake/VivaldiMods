// Activate Tab On Hover
// version 2022.10.0
// https://forum.vivaldi.net/post/395460
// Activates tab on hover.

(function activateTab() {
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
          let groupId = tab.parentNode.id.replace(/^tab-/g, "");
          let tabs = await chrome.tabs.query({ currentWindow: true });
          tabs = tabs.filter(t => {
            return JSON.parse(t.vivExtData).group == groupId;
          });
          tabs.forEach(t => {
            // 待完成标签组切换
          })
        } else {
          const id = Number(tab.parentNode.id.replace(/^\D+/g, ""));
          chrome.tabs.update(id, { active: true, highlighted: true });
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
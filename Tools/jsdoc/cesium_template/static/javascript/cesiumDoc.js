(function () {
  var filterType = document.getElementById("filterType");
  var classFilter = document.getElementById("ClassFilter");
  var classList = document.getElementById("ClassList");

  function filter() {
    var value = classFilter.value.toLowerCase();

    var items = classList.getElementsByTagName("li");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var itemName = item.getAttribute("data-name") || "";
      itemName = itemName.toLowerCase().replace(/\s/g, "");
      if (itemName.indexOf(value) >= 0) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    }
  }
  classFilter.onkeyup = filter;

  function getQueryParameter(name) {
    var match = new RegExp("[?&]" + name + "=([^&]*)").exec(
      window.location.search,
    );
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
  }

  var show = getQueryParameter("show");
  if (show) {
    document.getElementById("filterType").value = show;
  }

  var searchTerm = getQueryParameter("classFilter") || "";
  classFilter.value = searchTerm;
  filter();

  function resetFilter() {
    classFilter.value = "";
    filter();
  }

  function updateMenuLinks() {
    var links = classList.getElementsByTagName("a");
    var searchTerm = classFilter.value;
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var prefix = link.href.split("?")[0];
      var parts = prefix.split("#");
      link.href =
        parts[0] +
        (searchTerm === "" ? "" : "?classFilter=" + searchTerm) +
        (parts[1] ? "#" + parts[1] : "");
    }
  }

  var menuLinks = classList.getElementsByTagName("a");
  for (var i = 0; i < menuLinks.length; i++) {
    menuLinks[i].onclick = function () {
      updateMenuLinks();
    };
  }

  function shortcutHandler(e) {
    if (e.key === "k" && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      classFilter.focus();
      classFilter.select();
    }
  }
  document.body.addEventListener("keydown", shortcutHandler);

  classFilter.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Open the first "result" from the classlist when hitting enter
      const firstResult = document.querySelector(
        '#ClassList li:not([style="display: none;"]) a',
      );
      if (firstResult !== null) {
        // call click instead of just navigating to trigger the onclick handlers
        // that are set up above
        firstResult.click();
      }
    }
  });
})();

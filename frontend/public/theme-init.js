(function () {
        try {
          var saved = localStorage.getItem("portfolio-theme");
          var dark = saved ? saved === "dark" : true;
          var theme = dark ? "dark" : "light";
          document.documentElement.dataset.theme = theme;
          document.documentElement.classList.toggle("dark", dark);
          document.documentElement.style.colorScheme = theme;
        } catch (e) {}
      })();

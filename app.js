// Uredska posla — vanilla JS, bez ovisnosti, podaci u localStorage
(function () {
  "use strict";

  var TASKS_KEY = "uredska-posla:tasks";
  var COLLEAGUES_KEY = "uredska-posla:colleagues";
  var SIDEBAR_KEY = "uredska-posla:sidebar-collapsed";

  var STATUS_LABELS = {
    todo: "Za napraviti",
    "in-progress": "U tijeku",
    done: "Gotovo",
  };
  var PRIORITY_LABELS = { low: "Niski", medium: "Srednji", high: "Visoki" };
  var STATUS_ORDER = ["todo", "in-progress", "done"];

  var tasks = load(TASKS_KEY);
  var colleagues = load(COLLEAGUES_KEY);
  var filter = "all";
  var search = "";

  // --- Elementi ---
  var shell = document.getElementById("shell");
  var sidebarToggle = document.getElementById("sidebar-toggle");
  var sidebarNav = document.getElementById("sidebar-nav");

  var taskForm = document.getElementById("task-form");
  var listEl = document.getElementById("task-list");
  var searchEl = document.getElementById("search");
  var filtersEl = document.getElementById("filters");
  var assigneeSelect = document.getElementById("f-assignee");

  var colleagueForm = document.getElementById("colleague-form");
  var colleagueListEl = document.getElementById("colleague-list");

  // --- Perzistencija ---
  function load(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function isOverdue(task) {
    if (!task.deadline || task.status === "done") return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(task.deadline) < today;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ===================== SIDEBAR ===================== */

  function applySidebarState(collapsed) {
    shell.classList.toggle("sidebar-collapsed", collapsed);
    // « kad je otvoren (smanji), » kad je sažet (otvori)
    sidebarToggle.textContent = collapsed ? "»" : "«";
    save(SIDEBAR_KEY, collapsed);
  }

  function toggleSidebar() {
    applySidebarState(!shell.classList.contains("sidebar-collapsed"));
  }

  function switchView(view) {
    document.getElementById("view-tasks").classList.toggle("hidden", view !== "tasks");
    document
      .getElementById("view-colleagues")
      .classList.toggle("hidden", view !== "colleagues");
    Array.prototype.forEach.call(sidebarNav.querySelectorAll(".nav-card"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === view);
    });
  }

  /* ===================== ZADACI ===================== */

  function addTask(e) {
    e.preventDefault();
    var title = document.getElementById("f-title").value.trim();
    if (!title) return;
    tasks.unshift({
      id: uid(),
      title: title,
      description: document.getElementById("f-desc").value.trim(),
      assignee: document.getElementById("f-assignee").value.trim(),
      status: "todo",
      priority: document.getElementById("f-priority").value,
      deadline: document.getElementById("f-deadline").value,
      createdAt: Date.now(),
    });
    save(TASKS_KEY, tasks);
    taskForm.reset();
    document.getElementById("f-priority").value = "medium";
    renderTasks();
  }

  function updateStatus(id, status) {
    tasks = tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { status: status }) : t;
    });
    save(TASKS_KEY, tasks);
    renderTasks();
  }

  function removeTask(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    save(TASKS_KEY, tasks);
    renderTasks();
  }

  function getFiltered() {
    var q = search.trim().toLowerCase();
    return tasks
      .filter(function (t) {
        return filter === "all" ? true : t.status === filter;
      })
      .filter(function (t) {
        if (!q) return true;
        return (
          t.title.toLowerCase().indexOf(q) !== -1 ||
          (t.assignee || "").toLowerCase().indexOf(q) !== -1 ||
          (t.description || "").toLowerCase().indexOf(q) !== -1
        );
      });
  }

  function renderStats() {
    document.getElementById("stat-total").textContent = tasks.length;
    document.getElementById("stat-todo").textContent = tasks.filter(function (t) {
      return t.status === "todo";
    }).length;
    document.getElementById("stat-progress").textContent = tasks.filter(function (t) {
      return t.status === "in-progress";
    }).length;
    document.getElementById("stat-done").textContent = tasks.filter(function (t) {
      return t.status === "done";
    }).length;
  }

  function renderTasks() {
    renderStats();
    var items = getFiltered();
    listEl.innerHTML = "";

    if (items.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML =
        '<span class="empty-badge">@</span><p>Nema zadataka. Dodaj prvi zadatak s lijeve strane.</p>';
      listEl.appendChild(empty);
      return;
    }

    items.forEach(function (task) {
      var li = document.createElement("li");
      li.className =
        "task-card status-" + task.status + (isOverdue(task) ? " overdue" : "");

      var metaParts = "";
      if (task.assignee) {
        metaParts += '<span class="meta-item">@' + escapeHtml(task.assignee) + "</span>";
      }
      if (task.deadline) {
        metaParts +=
          '<span class="meta-item ' +
          (isOverdue(task) ? "meta-overdue" : "") +
          '">Rok: ' +
          escapeHtml(task.deadline) +
          (isOverdue(task) ? " (istekao)" : "") +
          "</span>";
      }

      var optionsHtml = STATUS_ORDER.map(function (s) {
        return (
          '<option value="' +
          s +
          '"' +
          (s === task.status ? " selected" : "") +
          ">" +
          STATUS_LABELS[s] +
          "</option>"
        );
      }).join("");

      li.innerHTML =
        '<div class="task-main">' +
        '<div class="task-top">' +
        '<span class="priority priority-' +
        task.priority +
        '">' +
        PRIORITY_LABELS[task.priority] +
        "</span>" +
        "<h3>" +
        escapeHtml(task.title) +
        "</h3>" +
        "</div>" +
        (task.description
          ? '<p class="task-desc">' + escapeHtml(task.description) + "</p>"
          : "") +
        '<div class="task-meta">' +
        metaParts +
        "</div>" +
        "</div>" +
        '<div class="task-actions">' +
        '<select class="status-select">' +
        optionsHtml +
        "</select>" +
        '<button class="btn-delete" title="Obriši zadatak">✕</button>' +
        "</div>";

      li.querySelector(".status-select").addEventListener("change", function (e) {
        updateStatus(task.id, e.target.value);
      });
      li.querySelector(".btn-delete").addEventListener("click", function () {
        removeTask(task.id);
      });

      listEl.appendChild(li);
    });
  }

  /* ===================== KOLEGE ===================== */

  function addColleague(e) {
    e.preventDefault();
    var name = document.getElementById("c-name").value.trim();
    if (!name) return;
    colleagues.push({
      id: uid(),
      name: name,
      role: document.getElementById("c-role").value.trim(),
    });
    colleagues.sort(function (a, b) {
      return a.name.localeCompare(b.name, "hr");
    });
    save(COLLEAGUES_KEY, colleagues);
    colleagueForm.reset();
    renderColleagues();
    renderAssigneeOptions();
  }

  function removeColleague(id) {
    colleagues = colleagues.filter(function (c) {
      return c.id !== id;
    });
    save(COLLEAGUES_KEY, colleagues);
    renderColleagues();
    renderAssigneeOptions();
  }

  function renderColleagues() {
    colleagueListEl.innerHTML = "";
    if (colleagues.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML =
        '<span class="empty-badge">👥</span><p>Nema kolega. Dodaj prvog kolegu s lijeve strane.</p>';
      colleagueListEl.appendChild(empty);
      return;
    }

    colleagues.forEach(function (col) {
      var taskCount = tasks.filter(function (t) {
        return t.assignee === col.name;
      }).length;

      var li = document.createElement("li");
      li.className = "colleague-card";
      li.innerHTML =
        '<div class="colleague-main">' +
        '<span class="colleague-avatar">' +
        escapeHtml(col.name.charAt(0).toUpperCase()) +
        "</span>" +
        '<div class="colleague-info">' +
        "<h3>" +
        escapeHtml(col.name) +
        "</h3>" +
        (col.role ? '<span class="colleague-role">' + escapeHtml(col.role) + "</span>" : "") +
        "</div>" +
        "</div>" +
        '<div class="colleague-actions">' +
        '<span class="colleague-badge">' +
        taskCount +
        " zad." +
        "</span>" +
        '<button class="btn-delete" title="Obriši kolegu">✕</button>' +
        "</div>";

      li.querySelector(".btn-delete").addEventListener("click", function () {
        removeColleague(col.id);
      });

      colleagueListEl.appendChild(li);
    });
  }

  function renderAssigneeOptions() {
    var current = assigneeSelect.value;
    var html = '<option value="">— odaberi kolegu —</option>';
    colleagues.forEach(function (col) {
      html +=
        '<option value="' + escapeHtml(col.name) + '">' + escapeHtml(col.name) + "</option>";
    });
    assigneeSelect.innerHTML = html;
    // zadrži prethodni odabir ako još postoji
    assigneeSelect.value = current;
  }

  /* ===================== EVENT HANDLERI ===================== */

  sidebarToggle.addEventListener("click", toggleSidebar);

  sidebarNav.addEventListener("click", function (e) {
    var btn = e.target.closest(".nav-card");
    if (!btn) return;
    switchView(btn.getAttribute("data-view"));
  });

  taskForm.addEventListener("submit", addTask);
  colleagueForm.addEventListener("submit", addColleague);

  searchEl.addEventListener("input", function (e) {
    search = e.target.value;
    renderTasks();
  });

  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    filter = btn.getAttribute("data-filter");
    Array.prototype.forEach.call(filtersEl.querySelectorAll(".chip"), function (c) {
      c.classList.toggle("active", c === btn);
    });
    renderTasks();
  });

  /* ===================== DEMO PODACI ===================== */

  function seedDemoData() {
    // Samo ako korisnik nema podataka (prvi posjet)
    if (tasks.length > 0 || colleagues.length > 0) return;

    colleagues = [
      { id: uid(), name: "Ana Anić", role: "Računovodstvo" },
      { id: uid(), name: "Ivan Ivić", role: "IT podrška" },
      { id: uid(), name: "Marko Marković", role: "Prodaja" },
      { id: uid(), name: "Petra Petrović", role: "Administracija" },
    ];
    save(COLLEAGUES_KEY, colleagues);

    var now = Date.now();
    var day = 86400000;
    function futureDate(days) {
      return new Date(now + days * day).toISOString().split("T")[0];
    }
    function pastDate(days) {
      return new Date(now - days * day).toISOString().split("T")[0];
    }

    tasks = [
      // Za napraviti
      { id: uid(), title: "Pripremiti mjesečni izvještaj o troškovima", description: "Izvještaj za kolovoz, uključiti sve kategorije", assignee: "Ana Anić", status: "todo", priority: "high", deadline: futureDate(3), createdAt: now - 2 * day },
      { id: uid(), title: "Naručiti uredski materijal (papir, toner)", description: "", assignee: "Ivan Ivić", status: "todo", priority: "low", deadline: futureDate(7), createdAt: now - 1 * day },
      { id: uid(), title: "Zakazati sastanak tima za ponedjeljak", description: "Sala B, 10:00", assignee: "Marko Marković", status: "todo", priority: "medium", deadline: futureDate(2), createdAt: now },
      { id: uid(), title: "Ažurirati popis kontakata klijenata", description: "Dodati nove kontakte iz srpnja", assignee: "Petra Petrović", status: "todo", priority: "low", deadline: futureDate(10), createdAt: now },
      { id: uid(), title: "Rezervirati salu za prezentaciju", description: "Prezentacija novog projekta — petak 14:00", assignee: "Ana Anić", status: "todo", priority: "medium", deadline: futureDate(4), createdAt: now },
      { id: uid(), title: "Zaliti cvijeće", description: "Zaliti cvijeće u uredu i na recepciji", assignee: "Petra Petrović", status: "todo", priority: "low", deadline: futureDate(1), createdAt: now },

      // U tijeku
      { id: uid(), title: "Izraditi ponudu za novog klijenta", description: "Klijent: TechNova d.o.o.", assignee: "Marko Marković", status: "in-progress", priority: "high", deadline: futureDate(1), createdAt: now - 3 * day },
      { id: uid(), title: "Organizirati arhivu dokumenata", description: "Digitalizacija papirnatih dokumenata iz 2025.", assignee: "Petra Petrović", status: "in-progress", priority: "medium", deadline: futureDate(14), createdAt: now - 5 * day },
      { id: uid(), title: "Odgovoriti na upite s e-maila", description: "15 nepročitanih poruka od klijenata", assignee: "Ivan Ivić", status: "in-progress", priority: "medium", deadline: futureDate(0), createdAt: now - 1 * day },

      // Gotovo
      { id: uid(), title: "Isplatiti putne troškove zaposlenika", description: "Putni nalozi za lipanj", assignee: "Ana Anić", status: "done", priority: "high", deadline: pastDate(2), createdAt: now - 7 * day },
      { id: uid(), title: "Poslati zapisnik sa sastanka", description: "Zapisnik sastanka od utorka", assignee: "Marko Marković", status: "done", priority: "low", deadline: pastDate(1), createdAt: now - 4 * day },
      { id: uid(), title: "Potvrditi termin servisa printera", description: "", assignee: "Ivan Ivić", status: "done", priority: "low", deadline: pastDate(3), createdAt: now - 6 * day },
    ];
    save(TASKS_KEY, tasks);
  }

  /* ===================== TEMA ===================== */

  var THEME_KEY = "uredska-posla:theme";
  var themeToggle = document.getElementById("theme-toggle");
  var themeIcon = document.getElementById("theme-icon");

  function applyTheme(theme) {
    document.body.classList.toggle("theme-grey", theme === "grey");
    themeIcon.textContent = theme === "grey" ? "☀️" : "🌙";
    save(THEME_KEY, theme);
  }

  function toggleTheme() {
    var current = document.body.classList.contains("theme-grey") ? "grey" : "dark";
    applyTheme(current === "grey" ? "dark" : "grey");
  }

  themeToggle.addEventListener("click", toggleTheme);

  // Primijeni spremljenu temu
  var savedTheme = load(THEME_KEY);
  if (savedTheme === "grey") applyTheme("grey");

  /* ===================== DATUM I VRIJEME ===================== */

  var datetimeEl = document.getElementById("datetime");
  var HR_DAYS = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

  function updateDateTime() {
    var now = new Date();
    var day = HR_DAYS[now.getDay()];
    var date = now.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });
    var time = now.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    // Izračun tjedna u godini (ISO 8601)
    var tmp = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    var firstThursday = new Date(tmp.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
    var week = 1 + Math.round((tmp - firstThursday) / (7 * 86400000));
    datetimeEl.innerHTML =
      '<span class="dt-time">' + time + ' <span class="dt-week">(tj. ' + week + ')</span></span><br>' +
      '<span class="dt-date">' + day + ", " + date + "</span>";
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  /* ===================== INIT ===================== */

  seedDemoData();
  applySidebarState(load(SIDEBAR_KEY) === true);
  renderAssigneeOptions();
  renderTasks();
  renderColleagues();
})();

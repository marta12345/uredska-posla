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
    // Znak "+" kad je otvoren (za zatvaranje), "»" kad je zatvoren (za otvaranje)
    sidebarToggle.textContent = collapsed ? "»" : "+";
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

  /* ===================== INIT ===================== */

  applySidebarState(load(SIDEBAR_KEY) === true);
  renderAssigneeOptions();
  renderTasks();
  renderColleagues();
})();

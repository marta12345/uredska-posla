// Uredska posla — vanilla JS, bez ovisnosti, podaci u localStorage
(function () {
  "use strict";

  var STORAGE_KEY = "uredska-posla:tasks";

  var STATUS_LABELS = {
    todo: "Za napraviti",
    "in-progress": "U tijeku",
    done: "Gotovo",
  };
  var PRIORITY_LABELS = { low: "Niski", medium: "Srednji", high: "Visoki" };
  var STATUS_ORDER = ["todo", "in-progress", "done"];

  var tasks = loadTasks();
  var filter = "all";
  var search = "";

  // --- Elementi ---
  var form = document.getElementById("task-form");
  var listEl = document.getElementById("task-list");
  var searchEl = document.getElementById("search");
  var filtersEl = document.getElementById("filters");

  // --- Perzistencija ---
  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

  // --- Akcije ---
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
    saveTasks();
    form.reset();
    document.getElementById("f-priority").value = "medium";
    render();
  }

  function updateStatus(id, status) {
    tasks = tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { status: status }) : t;
    });
    saveTasks();
    render();
  }

  function removeTask(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    saveTasks();
    render();
  }

  // --- Filtriranje ---
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

  // --- Prikaz statistike ---
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

  // --- Prikaz liste ---
  function render() {
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

  // --- Event handleri ---
  form.addEventListener("submit", addTask);

  searchEl.addEventListener("input", function (e) {
    search = e.target.value;
    render();
  });

  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    filter = btn.getAttribute("data-filter");
    Array.prototype.forEach.call(filtersEl.querySelectorAll(".chip"), function (c) {
      c.classList.toggle("active", c === btn);
    });
    render();
  });

  render();
})();

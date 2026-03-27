/* ==============================
   SMART STUDY PLANNER - script.js
   Dashboard Application Logic
   ==============================
   
   This file handles all dashboard functionality AFTER the user 
   is authenticated via phone number + OTP.
   
   The user session object (window.currentUser) is set by
   the inline script in index.html before this file loads.
   
   Session object structure:
     { id, name, phone, createdAt }
   ============================== */


// ========================
// APP STATE
// ========================
let tasks = [];
let subjects = [];
let pomodoroSessions = 0;
let isDarkMode = false;

// Timer state
let timer;
let isTimerRunning = false;
let isBreak = false;
let timeLeft = 25 * 60;
let hasShownDeadlineAlert = false;


// ========================
// INIT — runs after auth guard confirms user is logged in
// ========================
function initApp(user) {
    // Display the authenticated user's info in the sidebar
    const displayName = user.name || 'User';
    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-email').textContent = user.phone || '';
    document.getElementById('user-avatar').textContent = displayName.charAt(0).toUpperCase();

    // Use user ID to namespace localStorage keys (per-user data)
    const uid = user.id;
    tasks = JSON.parse(localStorage.getItem(`ssp_tasks_${uid}`)) || [];
    subjects = JSON.parse(localStorage.getItem(`ssp_subjects_${uid}`)) || [];
    pomodoroSessions = parseInt(localStorage.getItem(`ssp_pomodoro_${uid}`)) || 0;
    isDarkMode = localStorage.getItem('ssp_theme') === 'dark';

    // Store uid globally for save operations
    window._uid = uid;

    // Apply saved theme
    applyTheme();

    // Start the header clock
    updateDateTime();
    setInterval(updateDateTime, 30000);

    // Populate the UI
    populateSubjectSelects();
    renderSubjects();
    renderTasks();
    updateDashboardStats();
    renderUpcomingDeadlines();
    setMotivationalQuote();

    // Timer init
    updateTimerDisplay();
    document.getElementById('session-count').textContent = `${pomodoroSessions} sessions completed`;

    // Show deadline alerts once
    hasShownDeadlineAlert = false;
    checkDeadlineAlerts();
}

// Auto-init if currentUser is already set by index.html
if (window.currentUser) {
    initApp(window.currentUser);
}


// ========================
// UTILITY FUNCTIONS
// ========================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function save() {
    const uid = window._uid;
    if (!uid) return;
    localStorage.setItem(`ssp_tasks_${uid}`, JSON.stringify(tasks));
    localStorage.setItem(`ssp_subjects_${uid}`, JSON.stringify(subjects));
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}


// ========================
// NOTIFICATION SYSTEM
// ========================
function showNotification(message, type = 'info', title = '') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const icons = {
        info: 'ri-information-line',
        success: 'ri-checkbox-circle-line',
        warning: 'ri-alarm-warning-line',
        danger: 'ri-error-warning-line'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <i class="toast-icon ${icons[type] || icons.info}"></i>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="ri-close-line"></i></button>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('exiting');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}


// ========================
// DATE / TIME DISPLAY
// ========================
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const el = document.getElementById('current-date-time');
    if (el) el.textContent = now.toLocaleDateString('en-US', options);
}


// ========================
// MOTIVATIONAL QUOTES
// ========================
function setMotivationalQuote() {
    const quotes = [
        "\"The secret of getting ahead is getting started.\" — Mark Twain",
        "\"It always seems impossible until it's done.\" — Nelson Mandela",
        "\"Don't watch the clock; do what it does. Keep going.\" — Sam Levenson",
        "\"You don't have to be great to start, but you have to start to be great.\" — Zig Ziglar",
        "\"Focus on being productive instead of busy.\" — Tim Ferriss",
        "\"Success is the sum of small efforts, repeated day in and day out.\" — Robert Collier",
        "\"The only way to do great work is to love what you do.\" — Steve Jobs",
        "\"Education is the most powerful weapon to change the world.\" — Nelson Mandela"
    ];
    const el = document.getElementById('motivational-quote');
    if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}


// ========================
// THEME TOGGLE
// ========================
function applyTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        if (toggle) toggle.innerHTML = '<i class="ri-sun-line"></i> Light Mode';
    } else {
        document.body.removeAttribute('data-theme');
        if (toggle) toggle.innerHTML = '<i class="ri-moon-line"></i> Dark Mode';
    }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('ssp_theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
});


// ========================
// SIDEBAR NAVIGATION
// ========================
const navLinks = document.querySelectorAll('.nav-links li');
const sections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');
const pageTitles = {
    'dashboard-section': 'Dashboard',
    'tasks-section': 'Tasks',
    'subjects-section': 'Subjects',
    'timer-section': 'Pomodoro Timer'
};

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetId = link.getAttribute('data-target');

        navLinks.forEach(n => n.classList.remove('active'));
        link.classList.add('active');

        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id === targetId) s.classList.add('active');
        });

        if (pageTitle) pageTitle.textContent = pageTitles[targetId] || 'Dashboard';

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
    });
});

document.getElementById('mobile-nav-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

document.getElementById('goto-timer-btn').addEventListener('click', () => {
    document.querySelector('.nav-links li[data-target="timer-section"]').click();
});


// ========================
// SUBJECTS MANAGEMENT
// ========================
document.getElementById('subject-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('subject-title').value.trim();
    const color = document.getElementById('subject-color').value;

    if (!title) return;

    if (subjects.find(s => s.title.toLowerCase() === title.toLowerCase())) {
        showNotification('This subject already exists.', 'warning', 'Duplicate Subject');
        return;
    }

    subjects.push({ id: generateId(), title, color });
    save();
    document.getElementById('subject-form').reset();
    document.getElementById('subject-color').value = '#6366f1';

    populateSubjectSelects();
    renderSubjects();
    showNotification(`Subject "${title}" added successfully.`, 'success', 'Subject Created');
});

function renderSubjects() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';

    if (subjects.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="ri-book-3-line"></i><p>No subjects yet. Create one to start organizing your tasks.</p></div>`;
        return;
    }

    subjects.forEach(subject => {
        const count = tasks.filter(t => t.subjectId === subject.id).length;
        const div = document.createElement('div');
        div.className = 'subject-item';
        div.innerHTML = `
      <div class="subject-info">
        <div class="subject-color" style="background-color: ${subject.color}"></div>
        <span>${subject.title}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="subject-count">${count} task${count !== 1 ? 's' : ''}</span>
        <button class="btn-icon delete" onclick="deleteSubject('${subject.id}')" title="Delete"><i class="ri-delete-bin-line"></i></button>
      </div>
    `;
        list.appendChild(div);
    });
}

function populateSubjectSelects() {
    const selects = [
        document.getElementById('task-subject'),
        document.getElementById('filter-subject'),
        document.getElementById('edit-task-subject')
    ];

    selects.forEach((sel, i) => {
        if (!sel) return;
        sel.innerHTML = i === 1 ? '<option value="">All Subjects</option>' : '<option value="">Select Subject</option>';
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.title;
            sel.appendChild(opt);
        });
    });
}

window.deleteSubject = function (id) {
    const count = tasks.filter(t => t.subjectId === id).length;
    const msg = count > 0
        ? `This subject has ${count} task(s). Deleting it will remove them too. Continue?`
        : 'Delete this subject?';
    if (!confirm(msg)) return;

    subjects = subjects.filter(s => s.id !== id);
    tasks = tasks.filter(t => t.subjectId !== id);
    save();
    populateSubjectSelects();
    renderSubjects();
    renderTasks();
    updateDashboardStats();
    renderUpcomingDeadlines();
    showNotification('Subject deleted.', 'info', 'Removed');
};


// ========================
// TASKS MANAGEMENT
// ========================
document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const desc = document.getElementById('task-desc').value.trim();
    const subjectId = document.getElementById('task-subject').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if (!title || !subjectId || !deadline) {
        showNotification('Please fill in all required fields.', 'warning', 'Missing Fields');
        return;
    }

    tasks.push({
        id: generateId(),
        title,
        desc,
        subjectId,
        deadline,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    });

    save();
    document.getElementById('task-form').reset();
    renderTasks();
    renderSubjects();
    updateDashboardStats();
    renderUpcomingDeadlines();
    showNotification(`Task "${title}" created!`, 'success', 'Task Added');
});

function renderTasks() {
    const list = document.getElementById('tasks-list');
    const filtered = applyFiltersAndSort(tasks);
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="ri-checkbox-circle-line"></i><p>No tasks found. Time to relax or create new ones!</p></div>`;
        return;
    }

    filtered.forEach(task => {
        const today = getToday();
        const taskDate = new Date(task.deadline);
        taskDate.setHours(0, 0, 0, 0);

        const isPast = taskDate < today;
        const isToday = taskDate.getTime() === today.getTime();

        let deadlineClass = '';
        let deadlineLabel = '';
        if (task.completed) {
            deadlineClass = 'task-completed';
        } else if (isPast) {
            deadlineClass = 'deadline-past';
            deadlineLabel = `<span class="deadline-label"><i class="ri-alarm-warning-fill"></i> OVERDUE</span>`;
        } else if (isToday) {
            deadlineClass = 'deadline-today';
            deadlineLabel = `<span class="deadline-label"><i class="ri-time-line"></i> DUE TODAY</span>`;
        }

        const subject = subjects.find(s => s.id === task.subjectId) || { title: 'Unknown', color: '#999' };

        const div = document.createElement('div');
        div.className = `task-item ${deadlineClass}`;
        div.innerHTML = `
      <div class="task-item-left">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
        <div class="task-info">
          <h4>${task.title}</h4>
          ${task.desc ? `<p class="task-desc">${task.desc}</p>` : ''}
          <div class="task-meta">
            <span class="task-badge subject-badge" style="border-left: 3px solid ${subject.color}; padding-left: 0.5rem;">${subject.title}</span>
            <span class="task-badge priority-${task.priority}">${capitalize(task.priority)}</span>
            <span><i class="ri-calendar-line"></i> ${taskDate.toLocaleDateString()}</span>
            ${deadlineLabel}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon" onclick="openEditModal('${task.id}')" title="Edit"><i class="ri-edit-line"></i></button>
        <button class="btn-icon delete" onclick="deleteTask('${task.id}')" title="Delete"><i class="ri-delete-bin-line"></i></button>
      </div>
    `;
        list.appendChild(div);
    });
}


// ========================
// FILTERS & SORTING
// ========================
document.getElementById('filter-subject').addEventListener('change', renderTasks);
document.getElementById('filter-priority').addEventListener('change', renderTasks);
document.getElementById('sort-tasks').addEventListener('change', renderTasks);

function applyFiltersAndSort(items) {
    let result = [...items];

    const fSubject = document.getElementById('filter-subject').value;
    const fPriority = document.getElementById('filter-priority').value;
    const sortVal = document.getElementById('sort-tasks').value;

    if (fSubject) result = result.filter(t => t.subjectId === fSubject);
    if (fPriority) result = result.filter(t => t.priority === fPriority);

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (sortVal === 'deadline-asc') result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    else if (sortVal === 'deadline-desc') result.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
    else if (sortVal === 'priority') result.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return result;
}


// ========================
// TASK ACTIONS
// ========================
window.toggleTask = function (id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        save();
        renderTasks();
        renderSubjects();
        updateDashboardStats();
        renderUpcomingDeadlines();
        if (task.completed) showNotification('Task completed! Great work.', 'success', 'Well Done');
    }
};

window.deleteTask = function (id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(t => t.id !== id);
    save();
    renderTasks();
    renderSubjects();
    updateDashboardStats();
    renderUpcomingDeadlines();
};


// ========================
// EDIT TASK MODAL
// ========================
const editModal = document.getElementById('edit-task-modal');

document.getElementById('close-edit-modal').addEventListener('click', () => {
    editModal.classList.remove('active');
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.classList.remove('active');
});

window.openEditModal = function (id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-desc').value = task.desc || '';
    document.getElementById('edit-task-subject').value = task.subjectId;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-deadline').value = task.deadline;

    editModal.classList.add('active');
};

document.getElementById('edit-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.title = document.getElementById('edit-task-title').value.trim();
    task.desc = document.getElementById('edit-task-desc').value.trim();
    task.subjectId = document.getElementById('edit-task-subject').value;
    task.priority = document.getElementById('edit-task-priority').value;
    task.deadline = document.getElementById('edit-task-deadline').value;

    save();
    editModal.classList.remove('active');
    renderTasks();
    renderSubjects();
    updateDashboardStats();
    renderUpcomingDeadlines();
    showNotification('Task updated successfully.', 'success', 'Task Updated');
});


// ========================
// DASHBOARD STATISTICS
// ========================
function updateDashboardStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    const today = getToday();
    const overdue = tasks.filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        return d < today;
    }).length;

    document.getElementById('total-tasks-stat').textContent = total;
    document.getElementById('completed-tasks-stat').textContent = completed;
    document.getElementById('completion-rate-stat').textContent = `${rate}%`;
    document.getElementById('overdue-tasks-stat').textContent = overdue;
    document.getElementById('dashboard-total-tasks').textContent = total;
    document.getElementById('dashboard-progress').style.width = `${rate}%`;
}


// ========================
// UPCOMING DEADLINES
// ========================
function renderUpcomingDeadlines() {
    const list = document.getElementById('upcoming-list');
    list.innerHTML = '';

    const today = getToday();
    const limit = new Date(today);
    limit.setDate(today.getDate() + 3);

    const upcoming = tasks.filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= limit;
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (upcoming.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 1.5rem"><p>No immediate deadlines. Keep up the good work!</p></div>`;
        return;
    }

    upcoming.forEach(task => {
        const d = new Date(task.deadline);
        d.setHours(0, 0, 0, 0);
        const isToday = d.getTime() === today.getTime();
        const subject = subjects.find(s => s.id === task.subjectId) || { title: '—', color: '#999' };

        const div = document.createElement('div');
        div.className = `task-item ${isToday ? 'deadline-today' : ''}`;
        div.style.padding = '0.75rem';
        div.innerHTML = `
      <div class="task-item-left">
        <input type="checkbox" class="task-checkbox" onchange="toggleTask('${task.id}')">
        <div class="task-info">
          <h4 style="font-size: 0.85rem; margin-bottom: 2px;">${task.title}</h4>
          <div class="task-meta">
            <span class="task-badge subject-badge" style="border-left: 3px solid ${subject.color}; padding-left: 0.4rem;">${subject.title}</span>
            <span>${isToday ? '<b style="color:var(--warning)">Today</b>' : d.toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `;
        list.appendChild(div);
    });
}


// ========================
// DEADLINE ALERTS
// ========================
function checkDeadlineAlerts() {
    if (hasShownDeadlineAlert) return;

    const today = getToday();

    const todayTasks = tasks.filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    const overdueTasks = tasks.filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        return d < today;
    });

    if (overdueTasks.length > 0) {
        showNotification(`You have ${overdueTasks.length} overdue task(s)! Check your task list.`, 'danger', '⚠️ Overdue Tasks');
    }

    if (todayTasks.length > 0) {
        showNotification(`${todayTasks.length} task(s) are due TODAY. Don't forget!`, 'warning', '📅 Due Today');
    }

    hasShownDeadlineAlert = true;
}


// ========================
// POMODORO TIMER
// ========================
function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const el = document.getElementById('timer-display');
    const preview = document.getElementById('dashboard-timer-preview');

    if (el) {
        el.textContent = display;
        el.style.color = isBreak ? 'var(--success)' : 'var(--primary)';
    }
    if (preview) preview.textContent = display;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
            isTimerRunning = false;

            if (!isBreak) {
                pomodoroSessions++;
                const uid = window._uid;
                if (uid) localStorage.setItem(`ssp_pomodoro_${uid}`, pomodoroSessions);
                document.getElementById('session-count').textContent = `${pomodoroSessions} sessions completed`;
                showNotification('Focus session complete! Take a 5 minute break.', 'success', '🎉 Session Done');
                isBreak = true;
                timeLeft = 5 * 60;
            } else {
                showNotification("Break's over! Ready for another focus session?", 'info', '⏰ Break Ended');
                isBreak = false;
                timeLeft = 25 * 60;
            }
            updateTimerDisplay();
        }
    }, 1000);

    document.getElementById('btn-start-timer').disabled = true;
}

function pauseTimer() {
    clearInterval(timer);
    isTimerRunning = false;
    document.getElementById('btn-start-timer').disabled = false;
}

function resetTimer() {
    clearInterval(timer);
    isTimerRunning = false;
    isBreak = false;
    timeLeft = 25 * 60;
    document.getElementById('btn-start-timer').disabled = false;
    updateTimerDisplay();
}

document.getElementById('btn-start-timer').addEventListener('click', startTimer);
document.getElementById('btn-pause-timer').addEventListener('click', pauseTimer);
document.getElementById('btn-reset-timer').addEventListener('click', resetTimer);

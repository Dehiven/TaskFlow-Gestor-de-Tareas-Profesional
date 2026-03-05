/* ========================================
   TASKFLOW — Task Manager Application
   ======================================== */

'use strict';

class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
        this.currentFilter = 'todas';
        this.currentCategory = 'todas';
        this.currentPriority = 'todas';
        this.currentSort = 'newest';
        this.searchQuery = '';
        this.deleteTargetId = null;

        this.cacheDOM();
        this.bindEvents();
        this.initTheme();
        this.render();
    }

    /* ---- DOM Caching ---- */
    cacheDOM() {
        // Form
        this.form = document.getElementById('taskForm');
        this.input = document.getElementById('taskInput');
        this.categorySelect = document.getElementById('taskCategory');
        this.prioritySelect = document.getElementById('taskPriority');
        this.dateInput = document.getElementById('taskDate');

        // Task list
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');

        // Filters
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.filterCategory = document.getElementById('filterCategory');
        this.filterPriority = document.getElementById('filterPriority');
        this.sortOrder = document.getElementById('sortOrder');

        // Search
        this.searchInput = document.getElementById('searchInput');
        this.searchClear = document.getElementById('searchClear');

        // Mobile search
        this.mobileSearchBtn = document.getElementById('mobileSearchBtn');
        this.mobileSearchBar = document.getElementById('mobileSearchBar');
        this.mobileSearchInput = document.getElementById('mobileSearchInput');
        this.mobileSearchClear = document.getElementById('mobileSearchClear');

        // Stats
        this.statTotal = document.getElementById('statTotal');
        this.statPending = document.getElementById('statPending');
        this.statCompleted = document.getElementById('statCompleted');
        this.statOverdue = document.getElementById('statOverdue');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressFill = document.getElementById('progressFill');
        this.categoriesSummary = document.getElementById('categoriesSummary');

        // Modal
        this.deleteModal = document.getElementById('deleteModal');
        this.modalTaskName = document.getElementById('modalTaskName');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalConfirm = document.getElementById('modalConfirm');

        // Bulk actions
        this.bulkActions = document.getElementById('bulkActions');
        this.clearCompleted = document.getElementById('clearCompleted');

        // Theme
        this.themeToggle = document.getElementById('themeToggle');

        // Toast
        this.toastContainer = document.getElementById('toastContainer');
    }

    /* ---- Event Binding ---- */
    bindEvents() {
        // Add task
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Keyboard shortcut
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.input.value = '';
                this.input.blur();
            }
        });

        // Search
        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput.value.trim().toLowerCase();
            this.searchClear.classList.toggle('visible', this.searchInput.value.length > 0);
            this.render();
        });

        this.searchClear.addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.searchClear.classList.remove('visible');
            this.render();
        });

        // Mobile search
        this.mobileSearchBtn.addEventListener('click', () => {
            const isActive = this.mobileSearchBar.classList.toggle('active');
            this.mobileSearchBtn.classList.toggle('active', isActive);
            if (isActive) this.mobileSearchInput.focus();
            else {
                this.mobileSearchInput.value = '';
                this.searchQuery = '';
                this.mobileSearchClear.classList.remove('visible');
                this.render();
            }
        });

        this.mobileSearchInput.addEventListener('input', () => {
            this.searchQuery = this.mobileSearchInput.value.trim().toLowerCase();
            this.mobileSearchClear.classList.toggle('visible', this.mobileSearchInput.value.length > 0);
            this.render();
        });

        this.mobileSearchClear.addEventListener('click', () => {
            this.mobileSearchInput.value = '';
            this.searchQuery = '';
            this.mobileSearchClear.classList.remove('visible');
            this.render();
        });

        // Status filters
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.render();
            });
        });

        // Category & Priority filters
        this.filterCategory.addEventListener('change', () => {
            this.currentCategory = this.filterCategory.value;
            this.render();
        });

        this.filterPriority.addEventListener('change', () => {
            this.currentPriority = this.filterPriority.value;
            this.render();
        });

        // Sort
        this.sortOrder.addEventListener('change', () => {
            this.currentSort = this.sortOrder.value;
            this.render();
        });

        // Modal
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.modalConfirm.addEventListener('click', () => this.confirmDelete());
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) this.closeModal();
        });

        // Escape to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.deleteModal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Bulk clear
        this.clearCompleted.addEventListener('click', () => {
            const completed = this.tasks.filter(t => t.completed);
            if (completed.length === 0) return;
            this.tasks = this.tasks.filter(t => !t.completed);
            this.save();
            this.render();
            this.toast(`${completed.length} tarea(s) eliminada(s)`, 'success');
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    /* ---- Theme Management ---- */
    initTheme() {
        const saved = localStorage.getItem('taskflow_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('taskflow_theme', next);
        this.toast(`Tema ${next === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
    }

    /* ---- CRUD Operations ---- */
    addTask() {
        const text = this.input.value.trim();
        if (!text) {
            this.input.classList.add('shake');
            setTimeout(() => this.input.classList.remove('shake'), 300);
            return;
        }

        const task = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            text,
            category: this.categorySelect.value,
            priority: this.prioritySelect.value,
            dueDate: this.dateInput.value || null,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        this.tasks.unshift(task);
        this.save();

        // Reset form
        this.input.value = '';
        this.dateInput.value = '';
        this.input.focus();

        this.render();
        this.toast('Tarea añadida', 'success');
    }

    toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        this.save();
        this.render();
    }

    startEdit(id) {
        const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
        if (!taskEl) return;
        const textEl = taskEl.querySelector('.task-text');
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        textEl.setAttribute('contenteditable', 'true');
        textEl.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEdit = () => {
            textEl.removeAttribute('contenteditable');
            const newText = textEl.textContent.trim();
            if (newText && newText !== task.text) {
                task.text = newText;
                this.save();
                this.toast('Tarea actualizada', 'info');
            } else {
                textEl.textContent = task.text;
            }
        };

        textEl.addEventListener('blur', finishEdit, { once: true });
        textEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textEl.blur();
            }
            if (e.key === 'Escape') {
                textEl.textContent = task.text;
                textEl.blur();
            }
        });
    }

    requestDelete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        this.deleteTargetId = id;
        this.modalTaskName.textContent = `"${task.text}"`;
        this.deleteModal.classList.add('active');
    }

    confirmDelete() {
        if (!this.deleteTargetId) return;
        const idToDelete = this.deleteTargetId;
        this.closeModal();
        const taskEl = this.taskList.querySelector(`[data-id="${idToDelete}"]`);
        if (taskEl) {
            taskEl.classList.add('removing');
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== idToDelete);
                this.save();
                this.render();
            }, 300);
        } else {
            this.tasks = this.tasks.filter(t => t.id !== idToDelete);
            this.save();
            this.render();
        }
        this.toast('Tarea eliminada', 'error');
    }

    closeModal() {
        this.deleteModal.classList.remove('active');
        this.deleteTargetId = null;
    }

    /* ---- Filtering, Sorting & Searching ---- */
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Status filter
        if (this.currentFilter === 'pendientes') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completadas') {
            filtered = filtered.filter(t => t.completed);
        }

        // Category filter
        if (this.currentCategory !== 'todas') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }

        // Priority filter
        if (this.currentPriority !== 'todas') {
            filtered = filtered.filter(t => t.priority === this.currentPriority);
        }

        // Search
        if (this.searchQuery) {
            filtered = filtered.filter(t =>
                t.text.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort
        const priorityWeight = { alta: 3, media: 2, baja: 1 };

        switch (this.currentSort) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'priority':
                filtered.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
                break;
            case 'date':
                filtered.sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'name':
                filtered.sort((a, b) => a.text.localeCompare(b.text, 'es'));
                break;
        }

        return filtered;
    }

    /* ---- Drag & Drop ---- */
    setupDragAndDrop(li, task) {
        li.setAttribute('draggable', 'true');

        li.addEventListener('dragstart', (e) => {
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', task.id);
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            li.classList.add('drag-over');
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId === task.id) return;

            const draggedIndex = this.tasks.findIndex(t => t.id === draggedId);
            const targetIndex = this.tasks.findIndex(t => t.id === task.id);
            if (draggedIndex === -1 || targetIndex === -1) return;

            const [draggedTask] = this.tasks.splice(draggedIndex, 1);
            this.tasks.splice(targetIndex, 0, draggedTask);
            this.save();
            this.render();
        });
    }

    /* ---- Rendering ---- */
    render() {
        const filtered = this.getFilteredTasks();

        // Clear list
        this.taskList.innerHTML = '';

        // Empty state
        if (filtered.length === 0) {
            this.emptyState.classList.add('visible');
            if (this.tasks.length === 0) {
                this.emptyState.querySelector('h3').textContent = '¡No hay tareas!';
                this.emptyState.querySelector('p').textContent = 'Añade tu primera tarea para empezar a organizarte';
            } else {
                this.emptyState.querySelector('h3').textContent = 'Sin resultados';
                this.emptyState.querySelector('p').textContent = 'No se encontraron tareas con los filtros aplicados';
            }
        } else {
            this.emptyState.classList.remove('visible');
        }

        // Render tasks
        filtered.forEach((task, i) => {
            const li = this.createTaskElement(task, i);
            this.taskList.appendChild(li);
        });

        // Update stats
        this.updateStats();

        // Bulk actions visibility
        const hasCompleted = this.tasks.some(t => t.completed);
        this.bulkActions.classList.toggle('visible', hasCompleted);
    }

    createTaskElement(task, index) {
        const li = document.createElement('li');
        li.className = `task-item${task.completed ? ' completed' : ''}`;
        li.dataset.id = task.id;
        li.dataset.priority = task.priority;
        li.style.animationDelay = `${index * 0.04}s`;

        // Due date helpers
        const categoryEmojis = { personal: '🏠', trabajo: '💼', estudio: '📚', salud: '💪', otros: '📌' };
        const priorityLabels = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

        let dateHTML = '';
        if (task.dueDate) {
            const isOverdue = !task.completed && new Date(task.dueDate) < new Date(new Date().toDateString());
            const formattedDate = new Date(task.dueDate).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short'
            });
            dateHTML = `
                <span class="badge-date${isOverdue ? ' overdue' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    ${isOverdue ? '⚠ ' : ''}${formattedDate}
                </span>
            `;
        }

        li.innerHTML = `
            <label class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="checkmark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
            </label>
            <div class="task-content">
                <div class="task-text">${this.escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-badge badge-category" data-cat="${task.category}">
                        ${categoryEmojis[task.category] || '📌'} ${task.category}
                    </span>
                    <span class="task-badge badge-priority">${priorityLabels[task.priority]}</span>
                    ${dateHTML}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn btn-edit" title="Editar" aria-label="Editar tarea">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="task-action-btn btn-delete" title="Eliminar" aria-label="Eliminar tarea">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
            </div>
        `;

        // Events
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => this.toggleComplete(task.id));

        li.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.startEdit(task.id);
        });

        li.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.requestDelete(task.id);
        });

        // Drag & Drop
        this.setupDragAndDrop(li, task);

        return li;
    }

    /* ---- Stats ---- */
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const today = new Date(new Date().toDateString());
        const overdue = this.tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        this.statTotal.textContent = total;
        this.statPending.textContent = pending;
        this.statCompleted.textContent = completed;
        this.statOverdue.textContent = overdue;
        this.progressPercent.textContent = `${percent}%`;
        this.progressFill.style.width = `${percent}%`;

        // Category breakdown
        const categories = ['personal', 'trabajo', 'estudio', 'salud', 'otros'];
        const catColors = {
            personal: 'var(--cat-personal)',
            trabajo: 'var(--cat-trabajo)',
            estudio: 'var(--cat-estudio)',
            salud: 'var(--cat-salud)',
            otros: 'var(--cat-otros)',
        };
        const catEmojis = { personal: '🏠', trabajo: '💼', estudio: '📚', salud: '💪', otros: '📌' };

        const summaryHTML = categories.map(cat => {
            const count = this.tasks.filter(t => t.category === cat).length;
            return `
                <div class="category-stat">
                    <span class="category-dot" style="background: ${catColors[cat]}"></span>
                    <span class="category-stat-name">${catEmojis[cat]} ${cat}</span>
                    <span class="category-stat-count">${count}</span>
                </div>
            `;
        }).join('');

        // Keep the title
        this.categoriesSummary.innerHTML = `<h2 class="stats-title">Categorías</h2>${summaryHTML}`;
    }

    /* ---- Persistence ---- */
    save() {
        localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
    }

    /* ---- Toast Notifications ---- */
    toast(message, type = 'info') {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    /* ---- Utilities ---- */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/* ---- Initialize ---- */
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});
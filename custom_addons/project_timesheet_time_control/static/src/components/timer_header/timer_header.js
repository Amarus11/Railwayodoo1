/** @odoo-module */

import { Component, useState, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import {
    computeElapsedSeconds,
    formatAdaptiveTimer,
} from "@project_timesheet_time_control/utils/timer_utils";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes default

export class TimesheetTimerHeader extends Component {
    static template = "project_timesheet_time_control.TimesheetTimerHeader";
    static props = {
        onTimerStopped: { type: Function, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.descriptionInput = useRef("descriptionInput");
        this._timerSyncHandler = this._onTimerSyncEvent.bind(this);

        this.state = useState({
            // Timer state
            isRunning: false,
            runningTimerId: false,
            description: "",
            dateTime: false,
            elapsedText: "0:00:00",

            // Selectors
            projectId: false,
            projectName: "",
            taskId: false,
            taskName: "",
            tagIds: [],
            tagNames: [],

            // Dropdown data
            projects: [],
            tasks: [],
            tags: [],
            favorites: [],

            // UI state
            showProjectDropdown: false,
            showTaskDropdown: false,
            showTagDropdown: false,
            showFavoriteDropdown: false,
            projectSearch: "",
            taskSearch: "",
            tagSearch: "",

            // Idle detection
            idleDialogVisible: false,
            idleSeconds: 0,
            lastActivityTime: Date.now(),
        });

        this._tickerInterval = null;
        this._idleCheckInterval = null;
        this._originalTitle = document.title;
        this._boundKeyHandler = this._onGlobalKeyDown.bind(this);
        this._boundActivityHandler = this._onUserActivity.bind(this);
        this._boundClickOutside = this._onClickOutside.bind(this);

        onMounted(async () => {
            // Load initial data
            await this._loadRunningTimer();
            await this._loadProjects();
            await this._loadTags();
            await this._loadFavorites();

            // Start ticker if running
            if (this.state.isRunning) {
                this._startTicker();
            }

            // Keyboard shortcut listener
            document.addEventListener("keydown", this._boundKeyHandler);

            // Idle detection listeners
            document.addEventListener("mousemove", this._boundActivityHandler);
            document.addEventListener("keypress", this._boundActivityHandler);
            document.addEventListener("click", this._boundActivityHandler);
            document.addEventListener("scroll", this._boundActivityHandler);
            this._idleCheckInterval = setInterval(() => this._checkIdle(), 30000);

            // Click outside to close dropdowns
            document.addEventListener("click", this._boundClickOutside, true);

            // Sync with other timer components via OWL bus
            this.env.bus.addEventListener("timesheet_timer_changed", this._timerSyncHandler);
        });

        onWillUnmount(() => {
            this._stopTicker();
            this._restoreTitle();
            this.env.bus.removeEventListener("timesheet_timer_changed", this._timerSyncHandler);
            document.removeEventListener("keydown", this._boundKeyHandler);
            document.removeEventListener("mousemove", this._boundActivityHandler);
            document.removeEventListener("keypress", this._boundActivityHandler);
            document.removeEventListener("click", this._boundActivityHandler);
            document.removeEventListener("scroll", this._boundActivityHandler);
            document.removeEventListener("click", this._boundClickOutside, true);
            if (this._idleCheckInterval) {
                clearInterval(this._idleCheckInterval);
            }
        });
    }

    // ==================== DATA LOADING ====================

    async _loadRunningTimer() {
        try {
            const data = await this.orm.call(
                "account.analytic.line",
                "get_running_timer",
                []
            );
            if (data) {
                this.state.isRunning = true;
                this.state.runningTimerId = data.id;
                this.state.description = data.name || "";
                this.state.projectId = data.project_id;
                this.state.projectName = data.project_name;
                this.state.taskId = data.task_id;
                this.state.taskName = data.task_name;
                this.state.dateTime = data.date_time;
                this.state.tagIds = data.tag_ids || [];
                this.state.tagNames = data.tag_names || [];
            }
        } catch (e) {
            console.error("Failed to load running timer:", e);
        }
    }

    async _loadProjects() {
        try {
            this.state.projects = await this.orm.call(
                "account.analytic.line",
                "get_timer_projects",
                []
            );
        } catch (e) {
            console.error("Failed to load projects:", e);
        }
    }

    async _loadTasks() {
        if (!this.state.projectId) {
            this.state.tasks = [];
            return;
        }
        try {
            this.state.tasks = await this.orm.call(
                "account.analytic.line",
                "get_timer_tasks",
                [this.state.projectId]
            );
        } catch (e) {
            console.error("Failed to load tasks:", e);
        }
    }

    async _loadTags() {
        try {
            this.state.tags = await this.orm.call(
                "account.analytic.line",
                "get_timer_tags",
                []
            );
        } catch (e) {
            console.error("Failed to load tags:", e);
        }
    }

    async _loadFavorites() {
        try {
            this.state.favorites = await this.orm.call(
                "hr.timesheet.favorite",
                "get_my_favorites",
                []
            );
        } catch (e) {
            console.error("Failed to load favorites:", e);
        }
    }

    // ==================== TIMER CONTROLS ====================

    async onToggleTimer() {
        if (this.state.isRunning) {
            await this._stopTimer();
        } else {
            await this._startTimer();
        }
    }

    async _startTimer() {
        if (!this.state.projectId) {
            this.notification.add("Please select a project first.", {
                type: "warning",
                sticky: false,
            });
            return;
        }
        try {
            const data = await this.orm.call(
                "account.analytic.line",
                "start_timer",
                [
                    this.state.description || "/",
                    this.state.projectId,
                    this.state.taskId || false,
                    this.state.tagIds.length ? this.state.tagIds : false,
                ]
            );
            if (data) {
                this.state.isRunning = true;
                this.state.runningTimerId = data.id;
                this.state.dateTime = data.date_time;
                this.state.lastActivityTime = Date.now();
                this._startTicker();
                // Notify other timer components via OWL bus
                this.env.bus.trigger("timesheet_timer_changed", { action: "start", data });
            }
        } catch (e) {
            this.notification.add("Failed to start timer: " + (e.message || e), {
                type: "danger",
            });
        }
    }

    async _stopTimer() {
        try {
            await this.orm.call(
                "account.analytic.line",
                "stop_running_timer",
                []
            );
            this._resetTimerState();
            // Notify other timer components via OWL bus
            this.env.bus.trigger("timesheet_timer_changed", { action: "stop" });
            // Trigger dashboard refresh if parent provides callback
            if (this.props.onTimerStopped) {
                this.props.onTimerStopped();
            }
        } catch (e) {
            this.notification.add("Failed to stop timer: " + (e.message || e), {
                type: "danger",
            });
        }
    }

    _resetTimerState() {
        this.state.isRunning = false;
        this.state.runningTimerId = false;
        this.state.dateTime = false;
        this.state.elapsedText = "0:00:00";
        this._stopTicker();
        this._restoreTitle();
    }

    // ==================== TICKER ====================

    _startTicker() {
        this._stopTicker();
        this._updateElapsed();
        this._tickerInterval = setInterval(() => this._updateElapsed(), 1000);
    }

    _stopTicker() {
        if (this._tickerInterval) {
            clearInterval(this._tickerInterval);
            this._tickerInterval = null;
        }
    }

    _updateElapsed() {
        if (!this.state.dateTime) return;
        const elapsed = computeElapsedSeconds(this.state.dateTime);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        this.state.elapsedText = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        // Feature 10: Update browser tab title
        if (this.state.isRunning) {
            const desc = this.state.description || this.state.projectName || "Timer";
            document.title = `⏱ ${this.state.elapsedText} - ${desc}`;
        }
    }

    _restoreTitle() {
        document.title = this._originalTitle;
    }

    // ==================== DESCRIPTION (Feature 2) ====================

    onDescriptionInput(ev) {
        this.state.description = ev.target.value;
    }

    onDescriptionKeydown(ev) {
        if (ev.key === "Enter" && !this.state.isRunning && this.state.projectId) {
            this._startTimer();
        }
    }

    // ==================== PROJECT SELECTOR ====================

    onProjectSearchInput(ev) {
        this.state.projectSearch = ev.target.value;
    }

    get filteredProjects() {
        const q = (this.state.projectSearch || "").toLowerCase();
        if (!q) return this.state.projects;
        return this.state.projects.filter((p) =>
            p.name.toLowerCase().includes(q)
        );
    }

    toggleProjectDropdown(ev) {
        ev.stopPropagation();
        this.state.showProjectDropdown = !this.state.showProjectDropdown;
        this.state.showTaskDropdown = false;
        this.state.showTagDropdown = false;
        this.state.showFavoriteDropdown = false;
    }

    async selectProject(project) {
        this.state.projectId = project.id;
        this.state.projectName = project.name;
        this.state.taskId = false;
        this.state.taskName = "";
        this.state.showProjectDropdown = false;
        this.state.projectSearch = "";
        await this._loadTasks();
    }

    // ==================== TASK SELECTOR ====================

    onTaskSearchInput(ev) {
        this.state.taskSearch = ev.target.value;
    }

    get filteredTasks() {
        const q = (this.state.taskSearch || "").toLowerCase();
        if (!q) return this.state.tasks;
        return this.state.tasks.filter((t) => t.name.toLowerCase().includes(q));
    }

    toggleTaskDropdown(ev) {
        ev.stopPropagation();
        if (!this.state.projectId) {
            this.notification.add("Select a project first.", {
                type: "warning",
                sticky: false,
            });
            return;
        }
        this.state.showTaskDropdown = !this.state.showTaskDropdown;
        this.state.showProjectDropdown = false;
        this.state.showTagDropdown = false;
        this.state.showFavoriteDropdown = false;
    }

    selectTask(task) {
        this.state.taskId = task.id;
        this.state.taskName = task.name;
        this.state.showTaskDropdown = false;
        this.state.taskSearch = "";
    }

    // ==================== TAGS (Feature 8) ====================

    onTagSearchInput(ev) {
        this.state.tagSearch = ev.target.value;
    }

    get filteredTags() {
        const q = (this.state.tagSearch || "").toLowerCase();
        const tags = this.state.tags;
        if (!q) return tags;
        return tags.filter((t) => t.name.toLowerCase().includes(q));
    }

    toggleTagDropdown(ev) {
        ev.stopPropagation();
        this.state.showTagDropdown = !this.state.showTagDropdown;
        this.state.showProjectDropdown = false;
        this.state.showTaskDropdown = false;
        this.state.showFavoriteDropdown = false;
    }

    isTagSelected(tagId) {
        return this.state.tagIds.includes(tagId);
    }

    toggleTag(tag) {
        const idx = this.state.tagIds.indexOf(tag.id);
        if (idx >= 0) {
            this.state.tagIds.splice(idx, 1);
            this.state.tagNames.splice(idx, 1);
        } else {
            this.state.tagIds.push(tag.id);
            this.state.tagNames.push(tag.name);
        }
    }

    async onCreateTag(ev) {
        if (ev.key !== "Enter") return;
        const name = this.state.tagSearch.trim();
        if (!name) return;
        // Check if exists
        const existing = this.state.tags.find(
            (t) => t.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
            if (!this.isTagSelected(existing.id)) this.toggleTag(existing);
            this.state.tagSearch = "";
            return;
        }
        try {
            const newId = await this.orm.call("hr.timesheet.tag", "create", [
                { name },
            ]);
            const newTag = { id: newId, name, color: 0 };
            this.state.tags.push(newTag);
            this.toggleTag(newTag);
            this.state.tagSearch = "";
        } catch (e) {
            console.error("Failed to create tag:", e);
        }
    }

    removeTag(tagId) {
        const idx = this.state.tagIds.indexOf(tagId);
        if (idx >= 0) {
            this.state.tagIds.splice(idx, 1);
            this.state.tagNames.splice(idx, 1);
        }
    }

    // ==================== FAVORITES (Feature 3) ====================

    toggleFavoriteDropdown(ev) {
        ev.stopPropagation();
        this.state.showFavoriteDropdown = !this.state.showFavoriteDropdown;
        this.state.showProjectDropdown = false;
        this.state.showTaskDropdown = false;
        this.state.showTagDropdown = false;
    }

    async useFavorite(fav) {
        this.state.description = fav.name;
        this.state.projectId = fav.project_id;
        this.state.projectName = fav.project_name;
        this.state.taskId = fav.task_id || false;
        this.state.taskName = fav.task_name || "";
        this.state.tagIds = fav.tag_ids || [];
        this.state.tagNames = fav.tag_names || [];
        this.state.showFavoriteDropdown = false;
        await this._loadTasks();
        // Increment use count
        try {
            await this.orm.call("hr.timesheet.favorite", "increment_use", [
                [fav.id],
            ]);
        } catch (e) {
            // Non-critical
        }
    }

    async saveFavorite() {
        if (!this.state.projectId) {
            this.notification.add("Select a project to save as favorite.", {
                type: "warning",
                sticky: false,
            });
            return;
        }
        try {
            await this.orm.call("hr.timesheet.favorite", "add_favorite", [
                this.state.description || "/",
                this.state.projectId,
                this.state.taskId || false,
                this.state.tagIds.length ? this.state.tagIds : false,
            ]);
            await this._loadFavorites();
            this.notification.add("Saved to favorites!", {
                type: "success",
                sticky: false,
            });
        } catch (e) {
            this.notification.add("Failed to save favorite.", { type: "danger" });
        }
    }

    async deleteFavorite(ev, favId) {
        ev.stopPropagation();
        try {
            await this.orm.unlink("hr.timesheet.favorite", [favId]);
            await this._loadFavorites();
        } catch (e) {
            console.error("Failed to delete favorite:", e);
        }
    }

    // ==================== KEYBOARD SHORTCUTS (Feature 4) ====================

    _onGlobalKeyDown(ev) {
        // Ctrl+Shift+T to toggle timer
        if (ev.ctrlKey && ev.shiftKey && ev.key === "T") {
            ev.preventDefault();
            ev.stopPropagation();
            this.onToggleTimer();
        }
    }

    // ==================== IDLE DETECTION (Feature 5) ====================

    _onUserActivity() {
        this.state.lastActivityTime = Date.now();
        if (this.state.idleDialogVisible) {
            // User came back from idle - hide dialog, they can decide
        }
    }

    _checkIdle() {
        if (!this.state.isRunning) return;
        const idleMs = Date.now() - this.state.lastActivityTime;
        if (idleMs >= IDLE_TIMEOUT_MS && !this.state.idleDialogVisible) {
            this.state.idleDialogVisible = true;
            this.state.idleSeconds = Math.floor(idleMs / 1000);
        }
    }

    get idleTimeText() {
        const s = this.state.idleSeconds;
        const m = Math.floor(s / 60);
        if (m > 0) return `${m} minute(s)`;
        return `${s} second(s)`;
    }

    onIdleKeep() {
        // Keep the idle time, just dismiss dialog
        this.state.idleDialogVisible = false;
        this.state.lastActivityTime = Date.now();
    }

    async onIdleDiscard() {
        // Stop timer and discard idle time by adjusting end time
        this.state.idleDialogVisible = false;
        // Stop with the last activity time as the end time
        try {
            const running = await this.orm.call(
                "account.analytic.line",
                "search_read",
                [
                    [["id", "=", this.state.runningTimerId]],
                    ["date_time"],
                ],
                { limit: 1 }
            );
            if (running.length) {
                const lastActive = new Date(this.state.lastActivityTime);
                const start = new Date(running[0].date_time);
                const duration = Math.max(0, (lastActive - start) / 3600000);
                await this.orm.write("account.analytic.line", [this.state.runningTimerId], {
                    unit_amount: duration,
                });
            }
        } catch (e) {
            console.error("Failed to discard idle time:", e);
        }
        this._resetTimerState();
        this.notification.add("Timer stopped. Idle time discarded.", {
            type: "info",
            sticky: false,
        });
    }

    async onIdleStopKeep() {
        // Stop timer but keep all time including idle
        this.state.idleDialogVisible = false;
        await this._stopTimer();
    }

    // ==================== CLICK OUTSIDE ====================

    _onClickOutside(ev) {
        // Close all dropdowns when clicking outside
        const el = this.el;
        if (!el) return;
        if (!el.contains(ev.target)) {
            this.state.showProjectDropdown = false;
            this.state.showTaskDropdown = false;
            this.state.showTagDropdown = false;
            this.state.showFavoriteDropdown = false;
        }
    }

    get el() {
        return this.__owl__ && this.__owl__.bdom
            ? document.querySelector(".o_timer_header")
            : null;
    }

    // ==================== TAG COLORS ====================

    getTagColor(index) {
        const colors = [
            "#F06050", "#F4A460", "#F7CD1F", "#6CC1ED",
            "#814968", "#EB7E7F", "#2C8397", "#475577",
            "#D6145F", "#30C381", "#9365B8", "#4C4C4C",
        ];
        return colors[(index || 0) % colors.length];
    }

    // ==================== TIMER SYNC ====================

    async _onTimerSyncEvent(ev) {
        const eventData = ev.detail || {};
        // Ignore events we triggered ourselves (prevent reload loop)
        if (this.state._selfTriggered) return;
        await this._loadRunningTimer();
        if (this.state.isRunning) {
            this._startTicker();
        } else {
            this._stopTicker();
            this._restoreTitle();
        }
    }
}

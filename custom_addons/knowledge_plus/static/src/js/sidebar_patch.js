/** @odoo-module **/

import { KnowledgeSidebar } from "@knowledge/components/sidebar/sidebar";
import { patch } from "@web/core/utils/patch";

/**
 * Patch the KnowledgeSidebar to add collapse-to-icons functionality.
 * When collapsed, the sidebar shrinks to ~48px showing only article
 * emoji icons. Users can hover to see tooltips and click to open.
 */
patch(KnowledgeSidebar.prototype, {
    setup() {
        super.setup(...arguments);

        this.storageKeys.collapsed = "knowledge.sidebarCollapsed";

        // Add collapsed state
        this.state.sidebarCollapsed = localStorage.getItem(this.storageKeys.collapsed) === "true";

        // Build mini-icons list for collapsed mode
        this.state.miniIcons = [];
    },

    /**
     * Toggle sidebar between expanded and collapsed (mini-icons) mode.
     */
    toggleCollapse() {
        this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
        localStorage.setItem(this.storageKeys.collapsed, this.state.sidebarCollapsed);
    },

    /**
     * Get a flat list of root-level articles with their icons for mini mode.
     * @returns {Array<{id, icon, name, category, fa, isActive, formatType}>}
     */
    getMiniIcons() {
        const FORMAT_ICONS = {
            presentation: "fa-television",
            spreadsheet: "fa-table",
            whiteboard: "fa-paint-brush",
        };
        const icons = [];
        const sections = [
            { ids: this.state.workspaceIds || [], category: "workspace", fa: "fa-building" },
            { ids: this.state.sharedIds || [], category: "shared", fa: "fa-users" },
            { ids: this.state.privateIds || [], category: "private", fa: "fa-user" },
        ];
        for (const section of sections) {
            for (const id of section.ids) {
                const article = this.getArticle(id);
                if (article) {
                    const fmt = article.format_type || "article";
                    icons.push({
                        id: article.id,
                        icon: article.icon || null,
                        name: article.name || "Untitled",
                        category: section.category,
                        fa: FORMAT_ICONS[fmt] || section.fa,
                        formatType: fmt,
                        isActive: article.id === this.props.record.resId,
                    });
                }
            }
        }
        // Also include favorites
        for (const id of (this.state.favoriteIds || [])) {
            const article = this.getArticle(id);
            if (article && !icons.some(i => i.id === article.id)) {
                const fmt = article.format_type || "article";
                icons.push({
                    id: article.id,
                    icon: article.icon || null,
                    name: article.name || "Untitled",
                    category: "favorite",
                    fa: FORMAT_ICONS[fmt] || "fa-star",
                    formatType: fmt,
                    isActive: article.id === this.props.record.resId,
                });
            }
        }
        return icons;
    },

    /**
     * Handle click on a mini icon in collapsed mode.
     * @param {number} articleId
     */
    onMiniIconClick(articleId) {
        this.env.openArticle(articleId);
    },
});

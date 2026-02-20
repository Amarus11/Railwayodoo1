/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { FormController } from "@web/views/form/form_controller";
import { useService } from "@web/core/utils/hooks";
import { useChildSubEnv } from "@odoo/owl";
import { getRandomEmoji } from "./knowledge_utils";
import { KnowledgeSidebar } from "../components/sidebar/sidebar";

export class KnowledgeArticleFormController extends FormController {
    static template = "syntropy_knowledge.KnowledgeArticleFormView";
    static components = {
        ...FormController.components,
        KnowledgeSidebar,
    };

    setup() {
        super.setup();
        this.orm = useService("orm");
        this.actionService = useService("action");

        useChildSubEnv({
            createArticle: this.createArticle.bind(this),
            openArticle: this.openArticle.bind(this),
            renameArticle: this.renameArticle.bind(this),
        });
    }

    /**
     * Create a new article and navigate to it.
     * @param {Object} params
     * @param {number|false} params.parentId - Parent article ID
     * @param {string} params.category - workspace, private, shared
     * @param {boolean} params.isItem - Whether this is an article item
     */
    async createArticle({ parentId = false, category = "private", isItem = false } = {}) {
        const newId = await this.orm.call(
            "knowledge.article",
            "action_create_article",
            [_t("Untitled"), getRandomEmoji(), parentId || false, category, isItem],
        );
        await this.openArticle(newId);
    }

    /**
     * Navigate to an article by ID.
     * @param {number} articleId
     */
    async openArticle(articleId) {
        // Navigate via URL to avoid the action service's getLocalState crash.
        // The action service calls querySelector on all active controller DOMs
        // before performing doAction, which crashes when the form isn't mounted.
        window.location.assign(`/odoo/knowledge.article/${articleId}`);
    }

    /**
     * Rename the current article.
     * @param {string} newName
     */
    async renameArticle(newName) {
        if (!this.model.root.resId) return;
        await this.orm.write("knowledge.article", [this.model.root.resId], { name: newName });
        // Trigger a re-render
        await this.model.root.load();
    }

    /**
     * Safe getLocalState — guard against querySelector on null el.
     * The action service calls this on all active controllers when navigating.
     * If the form DOM has been destroyed or is not yet mounted, this.el is null
     * and the parent's querySelector call crashes the entire doAction chain.
     */
    getLocalState() {
        if (!this.el) return {};
        try {
            return super.getLocalState(...arguments);
        } catch {
            return {};
        }
    }

    /**
     * Override to auto-save on navigating away.
     */
    async beforeLeave() {
        if (this.model.root.isDirty) {
            await this.model.root.save({ noReload: true });
        }
    }
}

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
            [],
            {
                name: _t("Untitled"),
                icon: getRandomEmoji(),
                parent_id: parentId || false,
                category,
                is_item: isItem,
            },
        );
        await this.openArticle(newId);
    }

    /**
     * Navigate to an article by ID.
     * @param {number} articleId
     */
    async openArticle(articleId) {
        await this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: "knowledge.article",
            res_id: articleId,
            views: [[false, "form"]],
            view_mode: "form",
        }, {
            clearBreadcrumbs: true,
            additionalContext: { form_view_ref: "syntropy_knowledge.knowledge_article_view_form" },
        });
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
     * Override getLocalState to prevent querySelector crash when DOM is not available.
     * This happens when navigating away before the component is fully rendered.
     */
    getLocalState() {
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

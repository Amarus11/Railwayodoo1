/** @odoo-module **/

import { KnowledgeArticleFormController } from "@knowledge/js/knowledge_controller";
import { FormatSelectorDialog } from "@knowledge_plus/components/format_selector/format_selector";
import { patch } from "@web/core/utils/patch";

/**
 * Patch the KnowledgeArticleFormController to support format_type
 * when creating articles. Overrides createArticle to show a format
 * selector dialog, then passes the chosen format to the server.
 */
patch(KnowledgeArticleFormController.prototype, {
    setup() {
        super.setup(...arguments);
    },

    /**
     * Override createArticle to show format selector dialog first.
     * @param {string} category - "workspace", "shared", or "private"
     * @param {number|false} targetParentId - parent article id or false
     */
    async createArticle(category, targetParentId) {
        return new Promise((resolve) => {
            this.dialogService.add(FormatSelectorDialog, {
                onSelect: async (formatType) => {
                    const articleId = await this.orm.call(
                        "knowledge.article",
                        "article_create",
                        [],
                        {
                            is_private: category === "private",
                            parent_id: targetParentId ? targetParentId : false,
                            format_type: formatType,
                        }
                    );
                    this.openArticle(articleId);
                    resolve(articleId);
                },
            });
        });
    },

    /**
     * Override ensureArticleName: for non-article formats,
     * don't try to extract title from HTML body.
     */
    ensureArticleName() {
        const recordData = this.model.root.data;
        if (recordData.format_type && recordData.format_type !== "article") {
            // For non-article formats, just ensure there's a name
            if (!recordData.name) {
                const formatLabels = {
                    presentation: "Presentation",
                    spreadsheet: "Spreadsheet",
                    whiteboard: "Whiteboard",
                };
                return this.model.root.update({
                    name: formatLabels[recordData.format_type] || "Untitled",
                });
            }
            return;
        }
        return super.ensureArticleName(...arguments);
    },

    /**
     * Override getHtmlTitle: skip for non-article formats.
     */
    getHtmlTitle() {
        const recordData = this.model.root.data;
        if (recordData.format_type && recordData.format_type !== "article") {
            return recordData.name || undefined;
        }
        return super.getHtmlTitle(...arguments);
    },
});

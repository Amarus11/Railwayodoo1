/** @odoo-module **/

import { KnowledgeArticleFormRenderer } from "@knowledge/js/knowledge_renderers";
import { patch } from "@web/core/utils/patch";

/**
 * Patch the renderer to handle format-specific behavior.
 * The format editor widget handles rendering via the view_widgets registry,
 * but the renderer might need adjustments for non-article formats.
 */
patch(KnowledgeArticleFormRenderer.prototype, {
    setup() {
        super.setup(...arguments);
    },

    /**
     * Override to skip cover selector for non-article formats.
     */
    openCoverSelector() {
        const formatType = this.props.record.data.format_type;
        if (formatType && formatType !== "article") {
            // Cover images don't apply to non-article formats
            return;
        }
        return super.openCoverSelector(...arguments);
    },
});

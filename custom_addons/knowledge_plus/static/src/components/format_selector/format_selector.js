/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { Dialog } from "@web/core/dialog/dialog";
import { Component } from "@odoo/owl";

export class FormatSelectorDialog extends Component {
    static template = "knowledge_plus.FormatSelectorDialog";
    static components = { Dialog };
    static props = {
        close: Function,
        onSelect: Function,
    };

    get formats() {
        return [
            {
                type: "article",
                label: _t("Article"),
                description: _t("Rich text document with full editing capabilities"),
                icon: "fa-file-text-o",
                emoji: "📄",
            },
            {
                type: "presentation",
                label: _t("Presentation"),
                description: _t("Slide-based presentation like PowerPoint or Google Slides"),
                icon: "fa-television",
                emoji: "📊",
            },
            {
                type: "spreadsheet",
                label: _t("Spreadsheet"),
                description: _t("Data grid with formulas, like Excel or Google Sheets"),
                icon: "fa-table",
                emoji: "📈",
            },
            {
                type: "whiteboard",
                label: _t("Whiteboard"),
                description: _t("Freeform canvas for diagrams and sketches (Excalidraw)"),
                icon: "fa-paint-brush",
                emoji: "🎨",
            },
        ];
    }

    onFormatClick(formatType) {
        this.props.onSelect(formatType);
        this.props.close();
    }
}

/** @odoo-module **/

import { registry } from "@web/core/registry";
import { standardWidgetProps } from "@web/views/widgets/standard_widget_props";
import { PresentationEditor } from "@knowledge_plus/components/presentation_editor/presentation_editor";
import { SpreadsheetEditor } from "@knowledge_plus/components/spreadsheet_editor/spreadsheet_editor";
import { WhiteboardEditor } from "@knowledge_plus/components/whiteboard_editor/whiteboard_editor";
import { Component } from "@odoo/owl";

/**
 * Knowledge Format Editor Widget.
 * Renders the appropriate editor component based on the article's format_type.
 * Registered as a view_widget to be used via <widget name="knowledge_format_editor"/>.
 */
export class KnowledgeFormatEditor extends Component {
    static template = "knowledge_plus.FormatEditor";
    static props = { ...standardWidgetProps };
    static components = {
        PresentationEditor,
        SpreadsheetEditor,
        WhiteboardEditor,
    };

    get formatType() {
        return this.props.record.data.format_type || "article";
    }

    get isReadonly() {
        const data = this.props.record.data;
        return data.is_locked || !data.user_can_write || !data.active;
    }

    get isPresentation() {
        return this.formatType === "presentation";
    }

    get isSpreadsheet() {
        return this.formatType === "spreadsheet";
    }

    get isWhiteboard() {
        return this.formatType === "whiteboard";
    }
}

export const knowledgeFormatEditor = {
    component: KnowledgeFormatEditor,
    additionalClasses: ["o_knowledge_format_editor_widget", "w-100", "flex-grow-1"],
};

registry.category("view_widgets").add("knowledge_format_editor", knowledgeFormatEditor);

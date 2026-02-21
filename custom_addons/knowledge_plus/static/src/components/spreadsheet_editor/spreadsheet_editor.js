/** @odoo-module **/

import { useService } from "@web/core/utils/hooks";
import { Component, onMounted, onWillUnmount, useRef, useState, useEffect } from "@odoo/owl";

/**
 * Spreadsheet editor using x-spreadsheet library.
 * Data is stored as JSON in the `format_data` field.
 */
export class SpreadsheetEditor extends Component {
    static template = "knowledge_plus.SpreadsheetEditor";
    static props = {
        record: Object,
        readonly: { type: Boolean, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.container = useRef("spreadsheetContainer");
        this._spreadsheet = null;
        this._saveTimeout = null;

        this.state = useState({
            ready: false,
            error: null,
        });

        onMounted(() => {
            this.initSpreadsheet();
        });

        useEffect(
            () => {
                this.initSpreadsheet();
            },
            () => [this.props.record.resId]
        );

        onWillUnmount(() => {
            this.destroySpreadsheet();
        });
    }

    getSpreadsheetData() {
        const raw = this.props.record.data.format_data;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                // x-spreadsheet expects an array of sheet data
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                // Single sheet object → wrap in array
                return [parsed];
            } catch {
                return [{}];
            }
        }
        return [{}];
    }

    initSpreadsheet() {
        this.destroySpreadsheet();

        const el = this.container.el;
        if (!el) return;
        el.innerHTML = "";

        // Check if x-spreadsheet is available globally
        if (typeof window.x_spreadsheet === "undefined" && typeof window.x === "undefined") {
            this.state.error = "x-spreadsheet library not loaded. Please check the module installation.";
            this.state.ready = false;
            return;
        }

        const XSpreadsheet = window.x_spreadsheet || window.x;

        try {
            const data = this.getSpreadsheetData();

            this._spreadsheet = new XSpreadsheet(el, {
                mode: this.props.readonly ? "read" : "edit",
                showToolbar: !this.props.readonly,
                showGrid: true,
                showContextmenu: !this.props.readonly,
                showBottomBar: true,
                view: {
                    height: () => el.clientHeight,
                    width: () => el.clientWidth,
                },
                row: {
                    len: 100,
                    height: 25,
                },
                col: {
                    len: 26,
                    width: 100,
                    indexWidth: 60,
                    minWidth: 60,
                },
            });

            this._spreadsheet.loadData(data);

            // Listen for changes
            if (!this.props.readonly) {
                this._spreadsheet.change((changedData) => {
                    this.debouncedSave();
                });
            }

            this.state.ready = true;
            this.state.error = null;
        } catch (e) {
            console.error("Failed to initialize x-spreadsheet:", e);
            this.state.error = `Failed to initialize spreadsheet: ${e.message}`;
            this.state.ready = false;
        }
    }

    destroySpreadsheet() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        if (this._spreadsheet) {
            this._spreadsheet = null;
        }
        const el = this.container.el;
        if (el) {
            el.innerHTML = "";
        }
    }

    debouncedSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this.persistData(), 800);
    }

    persistData() {
        if (!this._spreadsheet) return;
        try {
            const data = this._spreadsheet.getData();
            const json = JSON.stringify(data);
            this.props.record.update({ format_data: json });
        } catch (e) {
            console.error("Failed to save spreadsheet data:", e);
        }
    }
}

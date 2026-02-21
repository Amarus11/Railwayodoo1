/** @odoo-module **/

import { useService } from "@web/core/utils/hooks";
import { Component, onMounted, onWillUnmount, useRef, useState, useEffect } from "@odoo/owl";

/**
 * Whiteboard editor using Excalidraw via an iframe.
 * Communication is done via postMessage API.
 * Data is stored as JSON in `format_data`.
 */
export class WhiteboardEditor extends Component {
    static template = "knowledge_plus.WhiteboardEditor";
    static props = {
        record: Object,
        readonly: { type: Boolean, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.iframeRef = useRef("excalidrawIframe");
        this._messageHandler = null;
        this._saveTimeout = null;
        this._iframeReady = false;

        this.state = useState({
            loading: true,
        });

        onMounted(() => {
            this.setupMessageListener();
        });

        useEffect(
            () => {
                this._iframeReady = false;
                this.state.loading = true;
            },
            () => [this.props.record.resId]
        );

        onWillUnmount(() => {
            this.cleanup();
        });
    }

    get iframeSrc() {
        return "/knowledge_plus/static/lib/excalidraw/excalidraw_wrapper.html";
    }

    getWhiteboardData() {
        const raw = this.props.record.data.format_data;
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch {
                return { elements: [], appState: {}, files: {} };
            }
        }
        return { elements: [], appState: {}, files: {} };
    }

    setupMessageListener() {
        this._messageHandler = (event) => {
            if (!event.data || !event.data.type) return;

            switch (event.data.type) {
                case "excalidraw:ready":
                    this.onIframeReady();
                    break;
                case "excalidraw:save":
                    this.onDataReceived(event.data.payload);
                    break;
            }
        };
        window.addEventListener("message", this._messageHandler);
    }

    onIframeReady() {
        this._iframeReady = true;
        this.state.loading = false;

        const data = this.getWhiteboardData();
        this.sendToIframe("excalidraw:init", data);
    }

    sendToIframe(type, payload) {
        const iframe = this.iframeRef.el;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type, payload }, "*");
        }
    }

    onDataReceived(payload) {
        if (!payload) return;
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            const json = JSON.stringify(payload);
            this.props.record.update({ format_data: json });
        }, 1000);
    }

    onIframeLoad() {
        // The iframe will send 'excalidraw:ready' once Excalidraw is loaded
    }

    cleanup() {
        if (this._messageHandler) {
            window.removeEventListener("message", this._messageHandler);
            this._messageHandler = null;
        }
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
    }
}

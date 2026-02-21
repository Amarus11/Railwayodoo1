/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { Component, onMounted, onWillUnmount, useRef, useState, useEffect } from "@odoo/owl";

/**
 * Presentation editor using RevealJS for rendering slides.
 * Slides are stored as JSON in the `format_data` field.
 * Each slide has: { id: number, content: string (HTML) }
 */
export class PresentationEditor extends Component {
    static template = "knowledge_plus.PresentationEditor";
    static props = {
        record: Object,
        readonly: { type: Boolean, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.slideContainer = useRef("slideContainer");
        this.previewContainer = useRef("previewContainer");

        this.state = useState({
            slides: [],
            activeSlideIndex: 0,
            previewMode: false,
            editingContent: "",
            theme: "white",
            transition: "slide",
        });

        onMounted(() => {
            this.loadData();
        });

        // Watch for record changes (switching articles)
        useEffect(
            () => {
                this.loadData();
            },
            () => [this.props.record.resId]
        );

        onWillUnmount(() => {
            this.destroyReveal();
        });
    }

    loadData() {
        const data = this.props.record.data.format_data;
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.state.slides = parsed.slides || [{ id: 1, content: "<h2>Title Slide</h2><p>Click to edit</p>" }];
                this.state.theme = parsed.theme || "white";
                this.state.transition = parsed.transition || "slide";
            } catch {
                this.state.slides = [{ id: 1, content: "<h2>Title Slide</h2><p>Click to edit</p>" }];
            }
        } else {
            this.state.slides = [{ id: 1, content: "<h2>Title Slide</h2><p>Click to edit</p>" }];
        }
        this.state.activeSlideIndex = 0;
        this.state.previewMode = false;
        this.state.editingContent = this.state.slides[0]?.content || "";
    }

    get activeSlide() {
        return this.state.slides[this.state.activeSlideIndex] || null;
    }

    get slideCount() {
        return this.state.slides.length;
    }

    selectSlide(index) {
        // Save current editing before switching
        this.saveCurrentSlideContent();
        this.state.activeSlideIndex = index;
        this.state.editingContent = this.state.slides[index]?.content || "";
    }

    saveCurrentSlideContent() {
        if (this.state.slides[this.state.activeSlideIndex]) {
            this.state.slides[this.state.activeSlideIndex].content = this.state.editingContent;
        }
    }

    onContentInput(ev) {
        this.state.editingContent = ev.target.value;
        // Auto-save to slide data
        if (this.state.slides[this.state.activeSlideIndex]) {
            this.state.slides[this.state.activeSlideIndex].content = this.state.editingContent;
        }
        this.debouncedSave();
    }

    addSlide() {
        this.saveCurrentSlideContent();
        const maxId = Math.max(0, ...this.state.slides.map(s => s.id));
        const newSlide = {
            id: maxId + 1,
            content: "<h2>New Slide</h2><p>Click to edit</p>",
        };
        this.state.slides.push(newSlide);
        this.state.activeSlideIndex = this.state.slides.length - 1;
        this.state.editingContent = newSlide.content;
        this.persistData();
    }

    duplicateSlide() {
        this.saveCurrentSlideContent();
        const current = this.state.slides[this.state.activeSlideIndex];
        if (!current) return;
        const maxId = Math.max(0, ...this.state.slides.map(s => s.id));
        const newSlide = {
            id: maxId + 1,
            content: current.content,
        };
        this.state.slides.splice(this.state.activeSlideIndex + 1, 0, newSlide);
        this.state.activeSlideIndex += 1;
        this.state.editingContent = newSlide.content;
        this.persistData();
    }

    deleteSlide() {
        if (this.state.slides.length <= 1) return;
        this.state.slides.splice(this.state.activeSlideIndex, 1);
        if (this.state.activeSlideIndex >= this.state.slides.length) {
            this.state.activeSlideIndex = this.state.slides.length - 1;
        }
        this.state.editingContent = this.state.slides[this.state.activeSlideIndex]?.content || "";
        this.persistData();
    }

    moveSlideUp() {
        const idx = this.state.activeSlideIndex;
        if (idx <= 0) return;
        this.saveCurrentSlideContent();
        const tmp = this.state.slides[idx];
        this.state.slides[idx] = this.state.slides[idx - 1];
        this.state.slides[idx - 1] = tmp;
        this.state.activeSlideIndex = idx - 1;
        this.persistData();
    }

    moveSlideDown() {
        const idx = this.state.activeSlideIndex;
        if (idx >= this.state.slides.length - 1) return;
        this.saveCurrentSlideContent();
        const tmp = this.state.slides[idx];
        this.state.slides[idx] = this.state.slides[idx + 1];
        this.state.slides[idx + 1] = tmp;
        this.state.activeSlideIndex = idx + 1;
        this.persistData();
    }

    async togglePreview() {
        this.saveCurrentSlideContent();
        this.state.previewMode = !this.state.previewMode;

        if (this.state.previewMode) {
            // Small delay to let the DOM render
            await new Promise(r => setTimeout(r, 100));
            this.initReveal();
        } else {
            this.destroyReveal();
        }
    }

    async initReveal() {
        const container = this.previewContainer.el;
        if (!container) return;

        // Build slides HTML
        const slidesHtml = this.state.slides.map(s =>
            `<section>${s.content}</section>`
        ).join("");

        container.innerHTML = `
            <div class="reveal">
                <div class="slides">${slidesHtml}</div>
            </div>
        `;

        // Dynamic import of Reveal
        try {
            const Reveal = (await import("/knowledge_plus/static/lib/revealjs/dist/reveal.esm.js")).default;
            this._revealInstance = new Reveal(container.querySelector(".reveal"), {
                hash: false,
                history: false,
                transition: this.state.transition,
                embedded: true,
                width: "100%",
                height: "100%",
                margin: 0.05,
                keyboard: true,
                controls: true,
                progress: true,
            });
            await this._revealInstance.initialize();
            // Navigate to the active slide
            this._revealInstance.slide(this.state.activeSlideIndex);
        } catch (e) {
            console.error("Failed to initialize RevealJS:", e);
            container.innerHTML = `<div class="alert alert-warning m-3">
                Could not load the presentation preview. RevealJS library may be missing.
            </div>`;
        }
    }

    destroyReveal() {
        if (this._revealInstance) {
            try {
                this._revealInstance.destroy();
            } catch { /* ignore */ }
            this._revealInstance = null;
        }
    }

    _saveTimeout = null;
    debouncedSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this.persistData(), 1000);
    }

    persistData() {
        this.saveCurrentSlideContent();
        const data = JSON.stringify({
            slides: this.state.slides,
            theme: this.state.theme,
            transition: this.state.transition,
        });
        this.props.record.update({ format_data: data });
    }

    /**
     * Get a plain-text excerpt from HTML for slide thumbnail label.
     */
    getSlideLabel(slide, index) {
        const tmp = document.createElement("div");
        tmp.innerHTML = slide.content;
        const text = tmp.textContent?.trim() || "";
        return text.substring(0, 40) || `Slide ${index + 1}`;
    }
}

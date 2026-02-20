/** @odoo-module **/

/**
 * Syntropy Docs — File Preview Widget
 *
 * Provides inline preview capabilities for uploaded files
 * (images, PDFs) in the document kanban and form views.
 */

import { registry } from "@web/core/registry";
import { Component, useState, onWillUpdateProps } from "@odoo/owl";

const PREVIEWABLE_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
];

const PREVIEWABLE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf"];

/**
 * Determines whether a file is previewable based on its name or MIME type.
 * @param {string} filename
 * @param {string} mimetype
 * @returns {boolean}
 */
export function isPreviewable(filename, mimetype) {
    if (mimetype && PREVIEWABLE_IMAGE_TYPES.includes(mimetype)) {
        return true;
    }
    if (filename) {
        const ext = filename.split(".").pop().toLowerCase();
        return PREVIEWABLE_EXTENSIONS.includes(ext);
    }
    return false;
}

/**
 * Returns a human-readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Returns a CSS class for the document type icon.
 * @param {string} docType
 * @returns {string}
 */
export function getDocTypeIcon(docType) {
    const icons = {
        document: "fa-file-text-o text-primary",
        spreadsheet: "fa-table text-success",
        note: "fa-sticky-note-o text-warning",
        file: "fa-file-o text-muted",
        link: "fa-link text-info",
        template: "fa-clone text-danger",
    };
    return icons[docType] || "fa-file-o";
}

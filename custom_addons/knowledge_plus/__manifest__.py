{
    "name": "Knowledge Plus",
    "summary": "Enhanced Knowledge: collapsible sidebar + presentations, spreadsheets & whiteboard formats",
    "description": "Extends the Knowledge module with a collapsible sidebar (mini-icons mode) "
                   "and three new article formats: Presentations (RevealJS), "
                   "Spreadsheets (x-spreadsheet), and Whiteboard (Excalidraw).",
    "version": "18.0.1.0.0",
    "author": "Syntropy",
    "license": "LGPL-3",
    "category": "Productivity/Knowledge",
    "depends": ["knowledge"],
    "data": [
        "views/knowledge_article_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            # --- External libraries ---
            "knowledge_plus/static/lib/revealjs/dist/reveal.css",
            "knowledge_plus/static/lib/revealjs/dist/theme/white.css",
            "knowledge_plus/static/lib/x-spreadsheet/xspreadsheet.css",
            "knowledge_plus/static/lib/x-spreadsheet/xspreadsheet.js",
            # --- SCSS ---
            "knowledge_plus/static/src/scss/sidebar_collapse.scss",
            "knowledge_plus/static/src/scss/format_presentation.scss",
            "knowledge_plus/static/src/scss/format_spreadsheet.scss",
            "knowledge_plus/static/src/scss/format_whiteboard.scss",
            # --- JS Patches ---
            "knowledge_plus/static/src/js/sidebar_patch.js",
            "knowledge_plus/static/src/js/renderer_patch.js",
            "knowledge_plus/static/src/js/controller_patch.js",
            # --- Components ---
            "knowledge_plus/static/src/components/**/*",
            # --- XML Templates ---
            "knowledge_plus/static/src/xml/**/*",
        ],
    },
    "installable": True,
    "application": False,
}

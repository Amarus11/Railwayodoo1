{
    "name": "Knowledge Plus",
    "summary": "Enhanced Knowledge: collapsible sidebar with mini-icons mode",
    "description": "Extends the Knowledge module with a collapsible sidebar (mini-icons mode).",
    "version": "18.0.1.1.0",
    "author": "Syntropy",
    "license": "LGPL-3",
    "category": "Productivity/Knowledge",
    "depends": ["knowledge"],
    "assets": {
        "web.assets_backend": [
            # --- SCSS ---
            "knowledge_plus/static/src/scss/sidebar_collapse.scss",
            # --- JS Patches ---
            "knowledge_plus/static/src/js/sidebar_patch.js",
            # --- XML Templates ---
            "knowledge_plus/static/src/xml/**/*",
        ],
    },
    "installable": True,
    "application": False,
}

# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
{
    "name": "Syntropy Docs",
    "version": "18.0.2.0.0",
    "category": "Productivity/Documents",
    "summary": "Gestión documental estilo Google Drive para tu organización",
    "description": """
Syntropy Docs — Document Management System
=============================================
Plataforma de gestión documental inspirada en Google Drive / Docs:

- **Workspaces** compartidos (como unidades compartidas)
- **Carpetas** jerárquicas con navegación tipo breadcrumb
- **Documentos** con editor HTML enriquecido y colaborativo
- **Hojas de cálculo** con editor de tablas integrado
- **Archivos adjuntos** con vista previa (PDF, imágenes, etc.)
- **Enlaces** a recursos externos
- **Notas rápidas** de texto plano
- Vista **Kanban tipo Drive** con miniaturas y thumbnails
- Sistema de **favoritos** (★) por usuario
- Flujo de publicación: Borrador → Revisión → Publicado
- **Versionado** automático con restauración
- Control de acceso por roles (Lector / Editor / Admin)
- Búsqueda avanzada y filtros por tipo, carpeta, etiqueta, autor
- Soporte **multi-compañía**
    """,
    "author": "Syntropy",
    "website": "https://github.com/syntropy",
    "license": "LGPL-3",
    "depends": [
        "base",
        "mail",
        "web_editor",
    ],
    "data": [
        # Security
        "security/knowledge_security.xml",
        "security/ir.model.access.csv",
        # Data
        "data/knowledge_data.xml",
        # Views
        "views/knowledge_workspace_views.xml",
        "views/knowledge_folder_views.xml",
        "views/knowledge_tag_views.xml",
        "views/knowledge_document_views.xml",
        "views/knowledge_favorite_views.xml",
        # Menus (last, after all actions are defined)
        "views/knowledge_menus.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "syntropy_knowledge_nath/static/src/scss/knowledge.scss",
            "syntropy_knowledge_nath/static/src/js/knowledge_preview.js",
        ],
    },
    "installable": True,
    "application": True,
    "auto_install": False,
}

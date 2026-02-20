# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import api, fields, models


class KnowledgeDocument(models.Model):
    """Documento multi-tipo — experiencia estilo Google Drive / Docs."""

    _name = "knowledge.document"
    _description = "Document"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "is_pinned desc, write_date desc"

    # ══════════════════════════════════════════════════════════════
    # Campos principales
    # ══════════════════════════════════════════════════════════════

    name = fields.Char(
        string="Nombre",
        required=True,
        tracking=True,
    )
    active = fields.Boolean(string="Activo", default=True, tracking=True)

    doc_type = fields.Selection(
        selection=[
            ("document", "📝 Documento"),
            ("spreadsheet", "📊 Hoja de cálculo"),
            ("note", "📌 Nota rápida"),
            ("file", "📎 Archivo adjunto"),
            ("link", "🔗 Enlace"),
            ("template", "📄 Plantilla"),
        ],
        string="Tipo",
        default="document",
        required=True,
        tracking=True,
        index=True,
    )

    # ── Ubicación ────────────────────────────────────────────────
    workspace_id = fields.Many2one(
        comodel_name="knowledge.workspace",
        string="Workspace",
        required=True,
        tracking=True,
        index=True,
        ondelete="restrict",
    )
    folder_id = fields.Many2one(
        comodel_name="knowledge.folder",
        string="Carpeta",
        index=True,
        ondelete="set null",
        domain="[('workspace_id', '=', workspace_id)]",
    )
    folder_path = fields.Char(
        related="folder_id.full_path",
        string="Ruta",
        store=True,
    )

    # ── Clasificación ────────────────────────────────────────────
    tag_ids = fields.Many2many(
        comodel_name="knowledge.tag",
        relation="knowledge_document_tag_rel",
        column1="document_id",
        column2="tag_id",
        string="Etiquetas",
    )

    # ══════════════════════════════════════════════════════════════
    # Contenido por tipo
    # ══════════════════════════════════════════════════════════════

    # Documento (rich text HTML) y Plantilla
    content = fields.Html(
        string="Contenido",
        sanitize=False,
        help="Contenido del documento en formato enriquecido",
    )

    # Hoja de cálculo (tabla HTML)
    spreadsheet_data = fields.Html(
        string="Hoja de cálculo",
        sanitize=False,
        help="Contenido de la hoja de cálculo en formato tabla",
    )

    # Nota rápida (texto plano)
    note_content = fields.Text(
        string="Nota",
        help="Contenido de texto plano",
    )

    # Enlace externo
    url = fields.Char(
        string="URL",
        help="Enlace a recurso externo",
    )
    url_description = fields.Text(
        string="Descripción del enlace",
    )

    # Archivo adjunto
    file_data = fields.Binary(
        string="Archivo",
        attachment=True,
    )
    file_name = fields.Char(
        string="Nombre del archivo",
    )
    file_size = fields.Integer(
        string="Tamaño (bytes)",
        compute="_compute_file_info",
        store=True,
    )
    file_size_display = fields.Char(
        string="Tamaño",
        compute="_compute_file_info",
        store=True,
    )
    mime_type = fields.Char(
        string="Tipo MIME",
        compute="_compute_file_info",
        store=True,
    )
    file_extension = fields.Char(
        string="Extensión",
        compute="_compute_file_info",
        store=True,
    )

    # ══════════════════════════════════════════════════════════════
    # Estado y flujo
    # ══════════════════════════════════════════════════════════════

    state = fields.Selection(
        selection=[
            ("draft", "Borrador"),
            ("review", "En revisión"),
            ("published", "Publicado"),
            ("archived", "Archivado"),
        ],
        string="Estado",
        default="draft",
        required=True,
        tracking=True,
        index=True,
        copy=False,
    )
    priority = fields.Selection(
        selection=[
            ("0", "Normal"),
            ("1", "Importante"),
            ("2", "Urgente"),
        ],
        string="Prioridad",
        default="0",
    )
    is_pinned = fields.Boolean(
        string="Fijado",
        default=False,
        help="Mantener al inicio de la lista",
    )

    # ══════════════════════════════════════════════════════════════
    # Autoría y fechas
    # ══════════════════════════════════════════════════════════════

    author_id = fields.Many2one(
        comodel_name="res.users",
        string="Creado por",
        default=lambda self: self.env.user,
        required=True,
        tracking=True,
        index=True,
    )
    last_editor_id = fields.Many2one(
        comodel_name="res.users",
        string="Última edición por",
        tracking=True,
    )
    reviewer_id = fields.Many2one(
        comodel_name="res.users",
        string="Revisor",
        tracking=True,
    )
    publish_date = fields.Datetime(
        string="Fecha de publicación",
        readonly=True,
        copy=False,
    )

    # ══════════════════════════════════════════════════════════════
    # Vista previa / Thumbnail
    # ══════════════════════════════════════════════════════════════

    thumbnail = fields.Binary(
        string="Miniatura",
        attachment=True,
        help="Imagen de vista previa del documento",
    )
    preview_text = fields.Char(
        string="Vista previa",
        compute="_compute_preview_text",
        store=True,
    )
    icon_class = fields.Char(
        string="Icono CSS",
        compute="_compute_icon_class",
    )
    doc_type_label = fields.Char(
        string="Tipo (etiqueta)",
        compute="_compute_doc_type_label",
    )

    # ══════════════════════════════════════════════════════════════
    # Versionado
    # ══════════════════════════════════════════════════════════════

    version_ids = fields.One2many(
        comodel_name="knowledge.document.version",
        inverse_name="document_id",
        string="Versiones",
        readonly=True,
    )
    version_count = fields.Integer(
        string="Versiones",
        compute="_compute_version_count",
    )
    current_version = fields.Integer(
        string="Versión",
        default=1,
        readonly=True,
        copy=False,
    )

    # ══════════════════════════════════════════════════════════════
    # Favoritos
    # ══════════════════════════════════════════════════════════════

    favorite_ids = fields.One2many(
        comodel_name="knowledge.favorite",
        inverse_name="document_id",
        string="Favoritos",
    )
    favorite_count = fields.Integer(
        string="★",
        compute="_compute_favorite_count",
    )
    is_favorite = fields.Boolean(
        string="Favorito",
        compute="_compute_is_favorite",
        inverse="_inverse_is_favorite",
    )

    # ══════════════════════════════════════════════════════════════
    # Métricas
    # ══════════════════════════════════════════════════════════════

    view_count = fields.Integer(
        string="Vistas",
        default=0,
        readonly=True,
        copy=False,
    )

    # ── Visual ───────────────────────────────────────────────────
    color = fields.Integer(string="Color", default=0)

    # ── Compañía ─────────────────────────────────────────────────
    company_id = fields.Many2one(
        related="workspace_id.company_id",
        store=True,
        index=True,
    )

    # ══════════════════════════════════════════════════════════════
    # Computados
    # ══════════════════════════════════════════════════════════════

    @api.depends("file_data", "file_name")
    def _compute_file_info(self):
        import base64
        import mimetypes

        for doc in self:
            if doc.file_data and doc.file_name:
                raw = base64.b64decode(doc.file_data) if doc.file_data else b""
                doc.file_size = len(raw)
                doc.mime_type = mimetypes.guess_type(doc.file_name)[0] or "application/octet-stream"
                ext = doc.file_name.rsplit(".", 1)[-1].lower() if "." in doc.file_name else ""
                doc.file_extension = ext
                # Formato legible
                size = len(raw)
                if size < 1024:
                    doc.file_size_display = f"{size} B"
                elif size < 1024 * 1024:
                    doc.file_size_display = f"{size / 1024:.1f} KB"
                else:
                    doc.file_size_display = f"{size / (1024 * 1024):.1f} MB"
            else:
                doc.file_size = 0
                doc.file_size_display = ""
                doc.mime_type = ""
                doc.file_extension = ""

    @api.depends("content", "note_content", "url", "file_name", "doc_type")
    def _compute_preview_text(self):
        import re

        for doc in self:
            text = ""
            if doc.doc_type == "document" and doc.content:
                # Extraer texto plano del HTML
                text = re.sub(r"<[^>]+>", "", doc.content or "")
            elif doc.doc_type == "spreadsheet" and doc.spreadsheet_data:
                text = "Hoja de cálculo"
            elif doc.doc_type == "note" and doc.note_content:
                text = doc.note_content or ""
            elif doc.doc_type == "link" and doc.url:
                text = doc.url
            elif doc.doc_type == "file" and doc.file_name:
                text = doc.file_name
            elif doc.doc_type == "template" and doc.content:
                text = re.sub(r"<[^>]+>", "", doc.content or "")
            doc.preview_text = (text or "")[:150].strip()

    def _compute_icon_class(self):
        icon_map = {
            "document": "fa fa-file-text-o text-primary",
            "spreadsheet": "fa fa-table text-success",
            "note": "fa fa-sticky-note-o text-warning",
            "file": "fa fa-paperclip text-secondary",
            "link": "fa fa-external-link text-info",
            "template": "fa fa-file-code-o text-muted",
        }
        ext_icon_map = {
            "pdf": "fa fa-file-pdf-o text-danger",
            "png": "fa fa-file-image-o text-purple",
            "jpg": "fa fa-file-image-o text-purple",
            "jpeg": "fa fa-file-image-o text-purple",
            "gif": "fa fa-file-image-o text-purple",
            "svg": "fa fa-file-image-o text-purple",
            "webp": "fa fa-file-image-o text-purple",
            "doc": "fa fa-file-word-o text-primary",
            "docx": "fa fa-file-word-o text-primary",
            "xls": "fa fa-file-excel-o text-success",
            "xlsx": "fa fa-file-excel-o text-success",
            "ppt": "fa fa-file-powerpoint-o text-danger",
            "pptx": "fa fa-file-powerpoint-o text-danger",
            "zip": "fa fa-file-archive-o text-warning",
            "rar": "fa fa-file-archive-o text-warning",
            "mp4": "fa fa-file-video-o text-info",
            "mp3": "fa fa-file-audio-o text-info",
        }
        for doc in self:
            if doc.doc_type == "file" and doc.file_extension:
                doc.icon_class = ext_icon_map.get(
                    doc.file_extension, icon_map.get(doc.doc_type, "fa fa-file-o")
                )
            else:
                doc.icon_class = icon_map.get(doc.doc_type, "fa fa-file-o")

    def _compute_doc_type_label(self):
        label_map = {
            "document": "Documento",
            "spreadsheet": "Hoja de cálculo",
            "note": "Nota",
            "file": "Archivo",
            "link": "Enlace",
            "template": "Plantilla",
        }
        for doc in self:
            doc.doc_type_label = label_map.get(doc.doc_type, "Documento")

    def _compute_version_count(self):
        for doc in self:
            doc.version_count = len(doc.version_ids)

    def _compute_favorite_count(self):
        for doc in self:
            doc.favorite_count = len(doc.favorite_ids)

    def _compute_is_favorite(self):
        for doc in self:
            doc.is_favorite = bool(
                doc.favorite_ids.filtered(lambda f: f.user_id == self.env.user)
            )

    def _inverse_is_favorite(self):
        Favorite = self.env["knowledge.favorite"]
        for doc in self:
            existing = Favorite.search(
                [("document_id", "=", doc.id), ("user_id", "=", self.env.uid)],
                limit=1,
            )
            if doc.is_favorite and not existing:
                Favorite.create({"document_id": doc.id, "user_id": self.env.uid})
            elif not doc.is_favorite and existing:
                existing.unlink()

    # ══════════════════════════════════════════════════════════════
    # Write tracking
    # ══════════════════════════════════════════════════════════════

    def write(self, vals):
        content_fields = {"content", "spreadsheet_data", "note_content", "url", "file_data"}
        if content_fields & set(vals.keys()):
            vals["last_editor_id"] = self.env.uid
        return super().write(vals)

    # ══════════════════════════════════════════════════════════════
    # Acciones de flujo
    # ══════════════════════════════════════════════════════════════

    def action_draft(self):
        self.write({"state": "draft"})

    def action_review(self):
        self.write({"state": "review"})

    def action_publish(self):
        for doc in self:
            doc._create_version()
        self.write({
            "state": "published",
            "publish_date": fields.Datetime.now(),
        })

    def action_archive_doc(self):
        self.write({"state": "archived", "active": False})

    def action_unarchive_doc(self):
        self.write({"state": "draft", "active": True})

    # ══════════════════════════════════════════════════════════════
    # Versionado
    # ══════════════════════════════════════════════════════════════

    def _create_version(self):
        self.ensure_one()
        self.current_version += 1
        vals = {
            "document_id": self.id,
            "name": f"v{self.current_version}",
            "version_number": self.current_version,
            "author_id": self.env.uid,
            "doc_type": self.doc_type,
        }
        # Guardar contenido según tipo
        if self.doc_type in ("document", "template"):
            vals["content"] = self.content
        elif self.doc_type == "spreadsheet":
            vals["content"] = self.spreadsheet_data
        elif self.doc_type == "note":
            vals["note_content"] = self.note_content
        self.env["knowledge.document.version"].create(vals)

    def action_view_versions(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": f"Versiones: {self.name}",
            "res_model": "knowledge.document.version",
            "view_mode": "list,form",
            "domain": [("document_id", "=", self.id)],
            "context": {"default_document_id": self.id},
        }

    # ══════════════════════════════════════════════════════════════
    # Acciones para creación rápida por tipo
    # ══════════════════════════════════════════════════════════════

    @api.model
    def action_new_document(self):
        return self._action_new_by_type("document", "📝 Nuevo Documento")

    @api.model
    def action_new_spreadsheet(self):
        return self._action_new_by_type("spreadsheet", "📊 Nueva Hoja de Cálculo")

    @api.model
    def action_new_note(self):
        return self._action_new_by_type("note", "📌 Nueva Nota")

    @api.model
    def action_new_upload(self):
        return self._action_new_by_type("file", "📎 Subir Archivo")

    @api.model
    def action_new_link(self):
        return self._action_new_by_type("link", "🔗 Nuevo Enlace")

    @api.model
    def _action_new_by_type(self, doc_type, title):
        return {
            "type": "ir.actions.act_window",
            "name": title,
            "res_model": "knowledge.document",
            "view_mode": "form",
            "target": "current",
            "context": {"default_doc_type": doc_type},
        }

    def action_open_preview(self):
        """Abrir vista previa del documento."""
        self.ensure_one()
        self.sudo().view_count += 1
        return {
            "type": "ir.actions.act_window",
            "name": self.name,
            "res_model": "knowledge.document",
            "res_id": self.id,
            "view_mode": "form",
            "target": "current",
        }

    def action_duplicate_as_template(self):
        """Duplicar este documento como plantilla."""
        self.ensure_one()
        new_doc = self.copy({
            "name": f"{self.name} (Plantilla)",
            "doc_type": "template",
            "state": "draft",
        })
        return {
            "type": "ir.actions.act_window",
            "res_model": "knowledge.document",
            "res_id": new_doc.id,
            "view_mode": "form",
            "target": "current",
        }

    def action_create_from_template(self):
        """Crear nuevo documento desde esta plantilla."""
        self.ensure_one()
        new_doc = self.copy({
            "name": f"{self.name} (Copia)",
            "doc_type": "document",
            "state": "draft",
        })
        return {
            "type": "ir.actions.act_window",
            "res_model": "knowledge.document",
            "res_id": new_doc.id,
            "view_mode": "form",
            "target": "current",
        }

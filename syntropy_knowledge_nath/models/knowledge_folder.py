# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import api, fields, models


class KnowledgeFolder(models.Model):
    """Carpetas jerárquicas — navegación estilo Google Drive."""

    _name = "knowledge.folder"
    _description = "Folder"
    _parent_name = "parent_id"
    _parent_store = True
    _order = "sequence, name"

    name = fields.Char(string="Nombre", required=True)
    description = fields.Text(string="Descripción")
    sequence = fields.Integer(string="Secuencia", default=10)
    active = fields.Boolean(string="Activo", default=True)

    # ── Jerarquía ────────────────────────────────────────────────
    parent_id = fields.Many2one(
        comodel_name="knowledge.folder",
        string="Carpeta padre",
        index=True,
        ondelete="cascade",
    )
    parent_path = fields.Char(index=True, unaccent=False)
    child_ids = fields.One2many(
        comodel_name="knowledge.folder",
        inverse_name="parent_id",
        string="Subcarpetas",
    )

    # ── Workspace ────────────────────────────────────────────────
    workspace_id = fields.Many2one(
        comodel_name="knowledge.workspace",
        string="Workspace",
        required=True,
        index=True,
        ondelete="cascade",
    )

    # ── Contenido ────────────────────────────────────────────────
    document_ids = fields.One2many(
        comodel_name="knowledge.document",
        inverse_name="folder_id",
        string="Documentos",
    )

    # ── Visual ───────────────────────────────────────────────────
    icon = fields.Char(string="Icono", default="📁")
    color = fields.Integer(string="Color", default=0)

    # ── Métricas ─────────────────────────────────────────────────
    document_count = fields.Integer(
        string="Documentos", compute="_compute_document_count",
    )
    subfolder_count = fields.Integer(
        string="Subcarpetas", compute="_compute_subfolder_count",
    )

    # ── Breadcrumb ───────────────────────────────────────────────
    full_path = fields.Char(
        string="Ruta completa",
        compute="_compute_full_path",
        store=True,
    )

    # ── Compañía ─────────────────────────────────────────────────
    company_id = fields.Many2one(
        related="workspace_id.company_id",
        store=True,
        index=True,
    )

    _sql_constraints = [
        (
            "name_parent_ws_uniq",
            "UNIQUE(name, parent_id, workspace_id)",
            "Ya existe una carpeta con ese nombre en la misma ubicación.",
        ),
    ]

    def _compute_document_count(self):
        for folder in self:
            folder.document_count = len(folder.document_ids)

    def _compute_subfolder_count(self):
        for folder in self:
            folder.subfolder_count = len(folder.child_ids)

    @api.depends("name", "parent_id", "parent_id.full_path")
    def _compute_full_path(self):
        for folder in self:
            names = []
            current = folder
            while current:
                names.append(current.name)
                current = current.parent_id
            folder.full_path = " / ".join(reversed(names))

    @api.constrains("parent_id")
    def _check_parent_recursion(self):
        if not self._check_recursion():
            raise models.ValidationError(
                "No se permiten carpetas recursivas."
            )

    def action_open_folder(self):
        """Abrir contenido de esta carpeta."""
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": f"📁 {self.full_path}",
            "res_model": "knowledge.document",
            "view_mode": "kanban,list,form",
            "domain": [("folder_id", "=", self.id)],
            "context": {
                "default_folder_id": self.id,
                "default_workspace_id": self.workspace_id.id,
            },
        }

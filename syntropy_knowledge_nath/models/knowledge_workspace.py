# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import api, fields, models


class KnowledgeWorkspace(models.Model):
    """Workspaces compartidos — equivalente a unidades compartidas de Google Drive."""

    _name = "knowledge.workspace"
    _description = "Workspace"
    _inherit = ["mail.thread"]
    _order = "sequence, name"

    name = fields.Char(
        string="Nombre",
        required=True,
        tracking=True,
    )
    description = fields.Text(
        string="Descripción",
    )
    icon = fields.Char(
        string="Icono",
        default="🏢",
    )
    color = fields.Integer(string="Color", default=0)
    sequence = fields.Integer(string="Secuencia", default=10)
    active = fields.Boolean(string="Activo", default=True)

    # ── Contenido ────────────────────────────────────────────────
    folder_ids = fields.One2many(
        comodel_name="knowledge.folder",
        inverse_name="workspace_id",
        string="Carpetas",
    )
    document_ids = fields.One2many(
        comodel_name="knowledge.document",
        inverse_name="workspace_id",
        string="Documentos",
    )

    # ── Miembros ─────────────────────────────────────────────────
    owner_id = fields.Many2one(
        comodel_name="res.users",
        string="Propietario",
        default=lambda self: self.env.user,
        required=True,
    )
    member_ids = fields.Many2many(
        comodel_name="res.users",
        relation="knowledge_workspace_member_rel",
        column1="workspace_id",
        column2="user_id",
        string="Miembros",
    )

    # ── Métricas ─────────────────────────────────────────────────
    folder_count = fields.Integer(
        compute="_compute_counts", string="Carpetas",
    )
    document_count = fields.Integer(
        compute="_compute_counts", string="Documentos",
    )

    # ── Compañía ─────────────────────────────────────────────────
    company_id = fields.Many2one(
        comodel_name="res.company",
        string="Compañía",
        default=lambda self: self.env.company,
        index=True,
    )

    def _compute_counts(self):
        for ws in self:
            ws.folder_count = len(ws.folder_ids)
            ws.document_count = self.env["knowledge.document"].search_count(
                [("workspace_id", "=", ws.id)]
            )

    def action_open_workspace(self):
        """Abrir vista de documentos filtrados por este workspace."""
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": self.name,
            "res_model": "knowledge.document",
            "view_mode": "kanban,list,form",
            "domain": [("workspace_id", "=", self.id)],
            "context": {
                "default_workspace_id": self.id,
                "search_default_group_folder": 1,
            },
        }

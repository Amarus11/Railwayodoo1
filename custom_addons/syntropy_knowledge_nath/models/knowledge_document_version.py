# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import api, fields, models


class KnowledgeDocumentVersion(models.Model):
    """Historial de versiones de documentos."""

    _name = "knowledge.document.version"
    _description = "Document Version"
    _order = "version_number desc"

    name = fields.Char(string="Versión", required=True)
    document_id = fields.Many2one(
        comodel_name="knowledge.document",
        string="Documento",
        required=True,
        ondelete="cascade",
        index=True,
    )
    doc_type = fields.Selection(
        selection=[
            ("document", "Documento"),
            ("spreadsheet", "Hoja de cálculo"),
            ("note", "Nota"),
            ("template", "Plantilla"),
        ],
        string="Tipo",
        readonly=True,
    )
    content = fields.Html(
        string="Contenido HTML",
        readonly=True,
        sanitize=False,
    )
    note_content = fields.Text(
        string="Contenido texto",
        readonly=True,
    )
    version_number = fields.Integer(
        string="Nº Versión",
        required=True,
        readonly=True,
    )
    author_id = fields.Many2one(
        comodel_name="res.users",
        string="Autor",
        required=True,
        readonly=True,
    )
    create_date = fields.Datetime(
        string="Fecha",
        readonly=True,
    )

    def action_restore_version(self):
        """Restaurar esta versión."""
        self.ensure_one()
        vals = {}
        if self.doc_type in ("document", "template"):
            vals["content"] = self.content
        elif self.doc_type == "spreadsheet":
            vals["spreadsheet_data"] = self.content
        elif self.doc_type == "note":
            vals["note_content"] = self.note_content
        self.document_id.write(vals)
        self.document_id.message_post(
            body=f"Contenido restaurado desde {self.name}.",
            message_type="comment",
        )
        return {
            "type": "ir.actions.act_window",
            "res_model": "knowledge.document",
            "res_id": self.document_id.id,
            "view_mode": "form",
            "target": "current",
        }

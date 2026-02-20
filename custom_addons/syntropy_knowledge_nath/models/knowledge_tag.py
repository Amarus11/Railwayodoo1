# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import fields, models


class KnowledgeTag(models.Model):
    """Etiquetas para clasificación transversal de artículos."""

    _name = "knowledge.tag"
    _description = "Knowledge Tag"
    _order = "name"

    name = fields.Char(
        string="Etiqueta",
        required=True,
        translate=True,
    )
    color = fields.Integer(
        string="Color",
        default=0,
    )
    active = fields.Boolean(
        string="Activo",
        default=True,
    )
    article_ids = fields.Many2many(
        comodel_name="knowledge.document",
        relation="knowledge_document_tag_rel",
        column1="tag_id",
        column2="document_id",
        string="Documentos",
    )
    article_count = fields.Integer(
        string="Nº Documentos",
        compute="_compute_article_count",
    )

    _sql_constraints = [
        (
            "name_uniq",
            "UNIQUE(name)",
            "Ya existe una etiqueta con ese nombre.",
        ),
    ]

    def _compute_article_count(self):
        for tag in self:
            tag.article_count = len(tag.article_ids)

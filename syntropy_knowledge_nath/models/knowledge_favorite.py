# Copyright 2026 Syntropy
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).

from odoo import fields, models


class KnowledgeFavorite(models.Model):
    """Favoritos personales de cada usuario."""

    _name = "knowledge.favorite"
    _description = "Knowledge Favorite"
    _order = "create_date desc"
    _rec_name = "document_id"

    user_id = fields.Many2one(
        comodel_name="res.users",
        string="Usuario",
        required=True,
        default=lambda self: self.env.user,
        index=True,
        ondelete="cascade",
    )
    document_id = fields.Many2one(
        comodel_name="knowledge.document",
        string="Documento",
        required=True,
        index=True,
        ondelete="cascade",
    )
    notes = fields.Text(
        string="Notas personales",
    )

    _sql_constraints = [
        (
            "user_document_uniq",
            "UNIQUE(user_id, document_id)",
            "Este documento ya está en tus favoritos.",
        ),
    ]

# -*- coding: utf-8 -*-
import json
from odoo import api, fields, models


class KnowledgeArticle(models.Model):
    _inherit = "knowledge.article"

    format_type = fields.Selection(
        [
            ("article", "Article"),
            ("presentation", "Presentation"),
            ("spreadsheet", "Spreadsheet"),
            ("whiteboard", "Whiteboard"),
        ],
        string="Format",
        default="article",
        required=True,
    )
    format_data = fields.Text(
        string="Format Data",
        prefetch=False,
        help="Stores JSON data for non-article formats (presentations, spreadsheets, whiteboards).",
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            fmt = vals.get("format_type", "article")
            if fmt != "article" and not vals.get("format_data"):
                vals["format_data"] = self._get_default_format_data(fmt)
        return super().create(vals_list)

    def _get_default_format_data(self, format_type):
        """Return default JSON data structure for a given format type."""
        if format_type == "presentation":
            return json.dumps({
                "slides": [
                    {
                        "id": 1,
                        "content": "<h2>Title Slide</h2><p>Click to edit</p>",
                    }
                ],
                "theme": "white",
                "transition": "slide",
            })
        elif format_type == "spreadsheet":
            return json.dumps({
                "name": "Sheet1",
                "rows": {},
                "cols": {},
                "styles": [],
                "merges": [],
            })
        elif format_type == "whiteboard":
            return json.dumps({
                "elements": [],
                "appState": {
                    "viewBackgroundColor": "#ffffff",
                    "gridSize": None,
                },
                "files": {},
            })
        return "{}"

    def article_create(self, title=False, parent_id=False, is_private=False,
                       is_article_item=False, article_properties=False,
                       format_type="article"):
        """Override to accept format_type parameter."""
        article = super().article_create(
            title=title,
            parent_id=parent_id,
            is_private=is_private,
            is_article_item=is_article_item,
            article_properties=article_properties,
        )
        if format_type != "article":
            article.write({
                "format_type": format_type,
                "format_data": self._get_default_format_data(format_type),
            })
        return article

    def write(self, vals):
        """Ensure format_data gets default when format_type changes."""
        if "format_type" in vals and vals["format_type"] != "article":
            if "format_data" not in vals:
                vals["format_data"] = self._get_default_format_data(vals["format_type"])
        return super().write(vals)

    def get_sidebar_articles(self, unfolded_ids=False):
        """Override to include format_type in sidebar article data."""
        result = super().get_sidebar_articles(unfolded_ids=unfolded_ids)
        if result.get("articles"):
            article_ids = [a["id"] for a in result["articles"]]
            formats = {
                r["id"]: r["format_type"]
                for r in self.browse(article_ids).sudo().read(["format_type"])
            }
            for article in result["articles"]:
                article["format_type"] = formats.get(article["id"], "article")
        return result

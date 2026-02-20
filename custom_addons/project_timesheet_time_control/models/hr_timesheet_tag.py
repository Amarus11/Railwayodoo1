# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import fields, models


class HrTimesheetTag(models.Model):
    _name = "hr.timesheet.tag"
    _description = "Timesheet Tag"
    _order = "name"

    name = fields.Char(string="Tag Name", required=True, translate=True)
    color = fields.Integer(string="Color Index")
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ("name_uniq", "unique (name)", "Tag name already exists!"),
    ]

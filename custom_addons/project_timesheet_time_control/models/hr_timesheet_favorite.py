# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class HrTimesheetFavorite(models.Model):
    _name = "hr.timesheet.favorite"
    _description = "Timesheet Favorite Entry"
    _order = "use_count desc, name"

    name = fields.Char(
        string="Description",
        required=True,
    )
    user_id = fields.Many2one(
        comodel_name="res.users",
        string="User",
        required=True,
        default=lambda self: self.env.user,
        index=True,
    )
    project_id = fields.Many2one(
        comodel_name="project.project",
        string="Project",
        required=True,
        domain="[('allow_timesheets', '=', True)]",
    )
    task_id = fields.Many2one(
        comodel_name="project.task",
        string="Task",
        domain="[('project_id', '=?', project_id)]",
    )
    tag_ids = fields.Many2many(
        comodel_name="hr.timesheet.tag",
        string="Tags",
    )
    use_count = fields.Integer(
        string="Times Used",
        default=0,
    )
    active = fields.Boolean(default=True)

    @api.model
    def get_my_favorites(self):
        """Return favorites for the current user, formatted for JS."""
        favorites = self.search([("user_id", "=", self.env.user.id)], limit=20)
        return [
            {
                "id": fav.id,
                "name": fav.name,
                "project_id": fav.project_id.id,
                "project_name": fav.project_id.name,
                "task_id": fav.task_id.id if fav.task_id else False,
                "task_name": fav.task_id.name if fav.task_id else "",
                "tag_ids": fav.tag_ids.ids,
                "tag_names": fav.tag_ids.mapped("name"),
                "use_count": fav.use_count,
            }
            for fav in favorites
        ]

    @api.model
    def add_favorite(self, name, project_id, task_id=False, tag_ids=None):
        """Create a new favorite from the timer header."""
        existing = self.search(
            [
                ("user_id", "=", self.env.user.id),
                ("name", "=", name),
                ("project_id", "=", project_id),
                ("task_id", "=", task_id or False),
            ],
            limit=1,
        )
        if existing:
            existing.use_count += 1
            return existing.id
        return self.create(
            {
                "name": name,
                "project_id": project_id,
                "task_id": task_id or False,
                "tag_ids": [(6, 0, tag_ids or [])],
            }
        ).id

    def increment_use(self):
        """Increment use counter when a favorite is used."""
        for fav in self:
            fav.use_count += 1

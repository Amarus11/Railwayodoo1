# Copyright 2016 Tecnativa - Antonio Espinosa
# Copyright 2016 Tecnativa - Sergio Teruel
# Copyright 2016-2018 Tecnativa - Pedro M. Baeza
# License AGPL-3 - See http://www.gnu.org/licenses/agpl-3.0.html

from datetime import datetime

from dateutil.relativedelta import relativedelta

from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.tools.sql import SQL


class AccountAnalyticLine(models.Model):
    _inherit = "account.analytic.line"
    _order = "date_time desc"

    date_time = fields.Datetime(
        string="Start Time", default=fields.Datetime.now, copy=False
    )
    date_time_end = fields.Datetime(
        string="End Time",
        compute="_compute_date_time_end",
        inverse="_inverse_date_time_end",
        search="_search_date_time_end",
    )
    show_time_control = fields.Selection(
        selection=[("resume", "Resume"), ("stop", "Stop")],
        compute="_compute_show_time_control",
        help="Indicate which time control button to show, if any.",
    )
    is_timer_running = fields.Boolean(
        string="Timer Running",
        compute="_compute_is_timer_running",
    )
    tag_ids = fields.Many2many(
        comodel_name="hr.timesheet.tag",
        string="Tags",
        relation="account_analytic_line_tag_rel",
        column1="line_id",
        column2="tag_id",
    )

    @api.depends("unit_amount", "date_time")
    def _compute_is_timer_running(self):
        for record in self:
            record.is_timer_running = not record.unit_amount and bool(record.date_time)

    @api.depends("date_time", "unit_amount", "product_uom_id")
    def _compute_date_time_end(self):
        hour_uom = self.env.ref("uom.product_uom_hour")
        day_uom = self.env.ref("uom.product_uom_day")
        for record in self:
            if (
                record.product_uom_id == hour_uom
                and record.date_time
                and record.unit_amount
            ):
                record.date_time_end = record.date_time + relativedelta(
                    hours=record.unit_amount
                )
            elif (
                record.product_uom_id == day_uom
                and day_uom.factor == 1
                and record.date_time
                and record.unit_amount
            ):
                record.date_time_end = record.date_time + relativedelta(
                    hours=record.unit_amount * hour_uom.factor
                )
            else:
                record.date_time_end = record.date_time_end

    def _inverse_date_time_end(self):
        hour_uom = self.env.ref("uom.product_uom_hour")
        for record in self.filtered(lambda x: x.date_time and x.date_time_end):
            if record.product_uom_id == hour_uom:
                record.unit_amount = (
                    record.date_time_end - record.date_time
                ).seconds / 3600

    @api.model
    def _eval_date(self, vals):
        if vals.get("date") and not vals.get("date_time"):
            return dict(
                vals,
                date_time=datetime.combine(
                    fields.Date.to_date(vals["date"]), fields.Datetime.now().time()
                ),
            )
        if vals.get("date_time"):
            return dict(vals, date=self._convert_datetime_to_date(vals["date_time"]))
        return vals

    def _convert_datetime_to_date(self, datetime_):
        if isinstance(datetime_, str):
            datetime_ = fields.Datetime.from_string(datetime_)
        return fields.Date.context_today(self, datetime_)

    @api.model
    def _running_domain(self):
        """Domain to find running timesheet lines."""
        return [
            ("date_time", "!=", False),
            ("user_id", "=", self.env.user.id),
            ("project_id.allow_timesheets", "=", True),
            ("unit_amount", "=", 0),
        ]

    @api.model
    def _duration(self, start, end):
        """Compute float duration between start and end."""
        try:
            return (end - start).total_seconds() / 3600
        except TypeError:
            return 0

    @api.depends("employee_id", "unit_amount")
    def _compute_show_time_control(self):
        """Decide when to show time controls."""
        for one in self:
            if one.employee_id not in self.env.user.employee_ids:
                one.show_time_control = False
            elif one.unit_amount or not one.date_time:
                one.show_time_control = "resume"
            else:
                one.show_time_control = "stop"

    @api.onchange("date")
    def _onchange_date(self):
        hour_uom = self.env.ref("uom.product_uom_hour")
        if self.product_uom_id == hour_uom and self.date_time:
            self.date_time = datetime.combine(self.date, self.date_time.time())

    @api.onchange("date_time", "date_time_end")
    def _onchange_date_time(self):
        hour_uom = self.env.ref("uom.product_uom_hour")
        self.date = self.date_time.date()
        if self.product_uom_id == hour_uom:
            if self.date_time and self.date_time_end:
                self.unit_amount = self._duration(self.date_time, self.date_time_end)
            else:
                self.unit_amount = 0

    @api.model_create_multi
    def create(self, vals_list):
        return super().create(list(map(self._eval_date, vals_list)))

    def write(self, vals):
        self_individual = self.env["account.analytic.line"]
        res_individual = True
        if "date" in vals and "date_time" not in vals:
            self_individual = self.filtered(lambda r: r.date_time)
            # overwrite the date part of date_time for each record
            for record in self_individual:
                vals["date_time"] = fields.Datetime.to_string(
                    datetime.combine(
                        fields.Date.to_date(vals["date"]),
                        record.date_time.time(),
                    )
                )
                res_individual |= super(AccountAnalyticLine, record).write(vals)
        return (
            super(AccountAnalyticLine, self - self_individual).write(
                self._eval_date(vals)
            )
            and res_individual
        )

    def button_resume_work(self):
        """Create a new record starting now, with a running timer."""
        return {
            "name": self.env._("Resume work"),
            "res_model": "hr.timesheet.switch",
            "target": "new",
            "type": "ir.actions.act_window",
            "view_mode": "form",
            "view_type": "form",
        }

    def button_end_work(self):
        end = fields.Datetime.to_datetime(
            self.env.context.get("stop_dt", datetime.now())
        )
        for line in self:
            if line.unit_amount:
                raise UserError(
                    self.env._(
                        "Cannot stop timer %d because it is not running. "
                        "Refresh the page and check again.",
                        line.id,
                    )
                )
            line.unit_amount = line._duration(line.date_time, end)
        return True

    @api.model
    def _search_date_time_end(self, operator, value):
        # reference value is 1 day == 8 hours
        hour_uom = self.env.ref("uom.product_uom_hour")
        return [
            (
                "date_time",
                operator,
                SQL(
                    "%(start_time)s - account_analytic_line.unit_amount * "
                    "(select 1 / factor * %(day_factor)s "
                    "from uom_uom where id = account_analytic_line.product_uom_id) * "
                    "interval '1 hour'",
                    start_time=datetime.strptime(value, "%Y-%m-%d %H:%M:%S"),
                    day_factor=hour_uom.factor,
                ),
            )
        ]

    # ---- Timer Header RPC methods ----

    @api.model
    def get_running_timer(self):
        """Return info about the current user's running timer, if any."""
        running = self.search(self._running_domain(), limit=1)
        if not running:
            return False
        return {
            "id": running.id,
            "name": running.name or "",
            "project_id": running.project_id.id if running.project_id else False,
            "project_name": running.project_id.name if running.project_id else "",
            "task_id": running.task_id.id if running.task_id else False,
            "task_name": running.task_id.name if running.task_id else "",
            "date_time": fields.Datetime.to_string(running.date_time),
            "tag_ids": running.tag_ids.ids,
            "tag_names": running.tag_ids.mapped("name"),
        }

    @api.model
    def start_timer(self, description, project_id, task_id=False, tag_ids=None):
        """Start a new timer, stopping any running one first."""
        # Stop any running timer
        running = self.search(self._running_domain())
        if running:
            running.button_end_work()
        # Create new timesheet line
        employee = self.env.user.employee_ids[:1]
        if not employee:
            return False
        vals = {
            "name": description or "/",
            "project_id": project_id,
            "task_id": task_id or False,
            "employee_id": employee.id,
            "date_time": fields.Datetime.now(),
            "unit_amount": 0,
        }
        if tag_ids:
            vals["tag_ids"] = [(6, 0, tag_ids)]
        new_line = self.create(vals)
        return {
            "id": new_line.id,
            "name": new_line.name,
            "project_id": new_line.project_id.id,
            "project_name": new_line.project_id.name,
            "task_id": new_line.task_id.id if new_line.task_id else False,
            "task_name": new_line.task_id.name if new_line.task_id else "",
            "date_time": fields.Datetime.to_string(new_line.date_time),
            "tag_ids": new_line.tag_ids.ids,
            "tag_names": new_line.tag_ids.mapped("name"),
        }

    @api.model
    def update_running_timer(self, vals):
        """Update the current user's running timer fields (description, project, task, tags)."""
        running = self.search(self._running_domain(), limit=1)
        if not running:
            return False
        write_vals = {}
        if "name" in vals:
            write_vals["name"] = vals["name"] or "/"
        if "project_id" in vals:
            write_vals["project_id"] = vals["project_id"]
            if not vals.get("task_id"):
                write_vals["task_id"] = False
        if "task_id" in vals:
            write_vals["task_id"] = vals["task_id"] or False
        if "tag_ids" in vals:
            write_vals["tag_ids"] = [(6, 0, vals["tag_ids"] or [])]
        if write_vals:
            running.write(write_vals)
        return {
            "id": running.id,
            "name": running.name or "",
            "project_id": running.project_id.id if running.project_id else False,
            "project_name": running.project_id.name if running.project_id else "",
            "task_id": running.task_id.id if running.task_id else False,
            "task_name": running.task_id.name if running.task_id else "",
            "date_time": fields.Datetime.to_string(running.date_time),
            "tag_ids": running.tag_ids.ids,
            "tag_names": running.tag_ids.mapped("name"),
        }

    @api.model
    def stop_running_timer(self):
        """Stop the current user's running timer and return the result."""
        running = self.search(self._running_domain(), limit=1)
        if not running:
            return False
        end = datetime.now()
        duration = running._duration(running.date_time, end)
        running.write({"unit_amount": duration})
        return {
            "id": running.id,
            "duration": duration,
        }

    @api.model
    def get_timer_projects(self):
        """Return list of projects available for timer."""
        projects = self.env["project.project"].search(
            [("allow_timesheets", "=", True)], order="name", limit=100
        )
        return [{"id": p.id, "name": p.name} for p in projects]

    @api.model
    def get_timer_tasks(self, project_id):
        """Return tasks for a given project."""
        domain = [
            ("project_id", "=", project_id),
            ("project_id.allow_timesheets", "=", True),
        ]
        tasks = self.env["project.task"].search(domain, order="name", limit=100)
        return [{"id": t.id, "name": t.name} for t in tasks]

    @api.model
    def get_timer_tags(self):
        """Return all available tags."""
        tags = self.env["hr.timesheet.tag"].search([], order="name")
        return [{"id": t.id, "name": t.name, "color": t.color} for t in tags]

/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ListController } from "@web/views/list/list_controller";
import { useService } from "@web/core/utils/hooks";
import { onMounted } from "@odoo/owl";

/**
 * Patch ListController to reload list when timer is stopped
 */
patch(ListController.prototype, {
    setup() {
        super.setup(...arguments);
        this.bus = useService("bus_service");

        onMounted(() => {
            // Listen for timer changes
            this.bus.addEventListener("timesheet_timer_changed", (ev) => {
                // Auto-reload if this is a timesheet/account.analytic.line view
                if (this.model.resModel === "account.analytic.line" && ev.detail.action === "stop") {
                    this.model.root.load();
                }
            });
        });
    },
});


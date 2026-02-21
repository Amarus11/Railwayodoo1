/** @odoo-module */

/**
 * Patch ListController so that when a timer stops, timesheet list views
 * auto-reload without requiring a manual page refresh.
 */
import { patch } from "@web/core/utils/patch";
import { ListController } from "@web/views/list/list_controller";
import { onMounted, onWillUnmount } from "@odoo/owl";

patch(ListController.prototype, {
    setup() {
        super.setup(...arguments);

        const handler = async (ev) => {
            if (this.model.resModel === "account.analytic.line") {
                try {
                    await this.model.root.load();
                    this.render(true);
                } catch (e) {
                    // non-critical
                }
            }
        };

        onMounted(() => {
            this.env.bus.addEventListener("timesheet_timer_changed", handler);
        });

        onWillUnmount(() => {
            this.env.bus.removeEventListener("timesheet_timer_changed", handler);
        });
    },
});

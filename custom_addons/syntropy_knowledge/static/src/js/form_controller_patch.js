/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";

/**
 * Patch FormController.getLocalState to prevent querySelector crash.
 *
 * The action service calls getLocalState() on all active controllers when
 * navigating. If the form DOM is not yet mounted (e.g., first load with no
 * record, or during rapid navigation), querySelector is called on a null
 * element, crashing the entire navigation.
 *
 * This patch wraps the original in a try/catch so the error is silently
 * handled and navigation continues.
 */
patch(FormController.prototype, {
    getLocalState() {
        try {
            return super.getLocalState(...arguments);
        } catch {
            return {};
        }
    },
});

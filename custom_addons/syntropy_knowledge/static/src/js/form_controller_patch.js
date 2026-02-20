/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";

/**
 * Direct prototype override for FormController.getLocalState.
 *
 * The action service calls getLocalState() on all active controllers when
 * navigating (via _updateUI → doAction). If the form DOM is not yet mounted
 * (e.g., first load with no record, component destroyed, or during rapid
 * navigation), querySelector is called on a null element reference, crashing
 * the entire navigation chain.
 *
 * We bypass Odoo's patch() utility and directly override the prototype method
 * to guarantee the try/catch is in place regardless of super-chain wiring.
 */
const _originalGetLocalState = FormController.prototype.getLocalState;

FormController.prototype.getLocalState = function () {
    try {
        return _originalGetLocalState.apply(this, arguments);
    } catch (e) {
        console.warn("FormController.getLocalState error (suppressed):", e?.message);
        return {};
    }
};

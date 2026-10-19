sap.ui.define([
	"./BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ar.com.relesa.shipment.planning.controller.NotFound", {

		onInit: function () {
			//BaseController.prototype.onInit.apply(this, arguments);
			this.getRouter().getTarget("notFound").attachDisplay(this._onNotFoundDisplayed, this);
		},

		_onNotFoundDisplayed: function () {
			this.getModel("appView").setProperty("/layout", "OneColumn");
		}
	});
});
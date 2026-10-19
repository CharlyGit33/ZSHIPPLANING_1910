sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"./model/models",
	"./services/ODataService",
	"./controller/ListSelector",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, oDataService, ListSelector, JSONModel) {
	"use strict";

	return UIComponent.extend("ar.com.relesa.shipment.planning.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {
			this.oListSelector = new ListSelector();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(oDataService.getModel("mainService"), "ShipmentService");

			// ===== ADAPTACION CRUD/DEEP ENTITY: switch global de prueba =====
			// Modelo compartido por TODAS las vistas/controllers (heredado automáticamente
			// desde el Component). /useCRUD en true = la app llama a los métodos *CRUD nuevos
			// (checkUncheckSet deep entity); en false = vuelve a los Function Imports legacy.
			// Lo togglea el Switch de ShipmentDetail.view.xml (binding de 2 vías a
			// testMode>/useCRUD); lo leen los métodos "...Switch" agregados al final de
			// BaseController.js / PalletDetail.controller.js / ShipmentDetail.controller.js.
			// Default true: preserva el comportamiento que ya estaba activo en las vistas
			// antes de agregar este switch.
			this.setModel(new JSONModel({ useCRUD: true }), "testMode");

			// call the base component's init function and create the App view
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ListSelector and ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy: function () {
			this.oListSelector.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				// eslint-disable-next-line sap-no-proprietary-browser-api
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});
});
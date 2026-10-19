sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/BarcodeScanner"
], function (BaseController, JSONModel, Scanner) {
	"use strict";

	return BaseController.extend("ar.com.relesa.shipment.planning.controller.App", {

		onInit: function () {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				layout: "OneColumn",
				previousLayout: "",
				actionButtonsInfo: {
					midColumn: {
						fullScreen: false
					}
				}
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function () {
				oViewModel.setProperty("/busy", false);
				//(oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
			this.getOwnerComponent().getModel("ShipmentService").metadataLoaded().then(fnSetAppNotBusy);
			this.getOwnerComponent().getModel("ShipmentService").attachMetadataFailed(fnSetAppNotBusy);
			this.getRouter().attachRoutePatternMatched(function (oEvent) {
				if (oEvent.getParameter("name") !== "shipmentDetail") {
					Scanner.getInstance().deactivate();
				}
			}, this);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
		}
	});
});
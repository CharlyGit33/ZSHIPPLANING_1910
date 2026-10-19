sap.ui.define([
	"sap/f/GridList",
	"./CustomGridListRenderer"
], function (
	GridList
) {
	"use strict";

	var CustomGridList = GridList.extend("ar.com.relesa.shipment.planning.controls.CustomGridList", {
		metadata: {
			events: {
				/**
				 * This event is fired when a item was removed after the confirm dialog is closed by pressing the ok button.
				 */
				afterModeChange: {
					parameters: {}
				}
			}
		}
	});

	CustomGridList.prototype.setMode = function (sMode) {
		let object = GridList.prototype.setMode.apply(this, arguments);
		this.fireAfterModeChange({ mode: sMode }, false, true);
		return object;
	};

	return CustomGridList;
});

sap.ui.define([], function () {
	"use strict";

	return {
		defaultFilters: {
			multiples: {
				shipmentDate: new Date(),
				salesOrganizationId: null,
				yardStatus: null,
				forwardingAgentId: null,
				deleted: false
			},
			individual: {
				shipmentId: null
			}
		}
	};
});
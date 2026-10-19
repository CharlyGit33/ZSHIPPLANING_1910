sap.ui.define([
    "./ODataService",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
], function (oDataService,Filter,FilterOperator) {
    "use strict";

    return {
        getModel: function () {
            return oDataService.getModel("userService");
        },
        getUserParameter: function (sUser, sParameter) {
            return new Promise(function (resolve, reject) {
                // let aFilters = []                
				// aFilters.push(new Filter('userId',FilterOperator.EQ,sUser))
				// aFilters.push(new Filter('parameterId',FilterOperator.EQ,sParameter))
                this.getModel().read(`/parameters(userId='${sUser}',parameterId='${sParameter}')`, {
                // this.getModel().read('/parameters', {
                    // filters: aFilters,
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        }
    }
});
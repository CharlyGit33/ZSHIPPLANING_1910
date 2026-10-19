sap.ui.define([
    "./ODataService",
], function (oDataService) {
    "use strict";

    return {

        getModel: function () {
            return oDataService.getModel("mainService");
        },

        palletRemoveTag: function (sLabelNumber, sSalesOrganizationId, sShipmentDate, sShipmentId,sShipmentType,sPalletId) {
            return this.callODataFunction("unassignLabel", {
                labelNumber: sLabelNumber,
                salesOrganizationId: sSalesOrganizationId,
                shipmentDate: sShipmentDate,
                shipmentId: sShipmentId,
                shipmentType: sShipmentType,
                palletId: sPalletId                
            });
        },

        palletScan: function (sLabelNumber, sSalesOrganizationId, sShipmentDate, sShipmentId,sShipmentType,sPalletId) {
            return this.callODataFunction("palletScan", {
                labelNumber: sLabelNumber,
                salesOrganizationId: sSalesOrganizationId,
                shipmentDate: sShipmentDate,
                shipmentId: sShipmentId,
                shipmentType: sShipmentType,
                palletId: sPalletId
            });
        },

        callODataFunction: function (sFunctionName, mUrlParameters) {
            return new Promise(function (resolve, reject) {
                this.getModel().callFunction("/" + sFunctionName, {
                    method: "POST",
                    urlParameters: mUrlParameters,
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        },

        updateObservedQuantity: function (sKey, sObservedQuantity) {
            return new Promise(function (resolve, reject) {
                this.getModel().update(sKey, {
                    observedQuantity: sObservedQuantity
                }, {
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        },

        read: function (sPath) {
            return new Promise(function (resolve, reject) {
                this.getModel().read(sPath, {
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        },

        getPlanningShipment: function (oData, sSalesOrganizationId) {
            const oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-ddTHH:mm:ss.0000000", UTC: true }),
                sPath = `/planningShipments(shipmentId='${oData.shipmentId}',salesOrganizationId='${sSalesOrganizationId}',shipmentDate=datetime'${encodeURIComponent(oDateFormat.format(oData.shipmentDate))}')`,
                oObject = this.getModel().getObject(sPath);
            let oPromise = null;

            if (!oObject) {
                oPromise = this.read(sPath);
            } else {
                oPromise = Promise.resolve(oObject);
            }
            return oPromise;
        }
    }
});
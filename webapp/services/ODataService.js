sap.ui.define([
], function () {
    "use strict";

    return {
        _servicePath: "/sap/opu/odata/sap/",
        models: new Map(),

        getModel: function (sDataSourceName) {
            if (!this.models.has(sDataSourceName)) {
                let oModel = new sap.ui.model.odata.v2.ODataModel(ar.com.relesa.shipment.planning.Component.getMetadata().getManifestEntry("sap.app").dataSources[sDataSourceName].uri);
                oModel.setSizeLimit(99999);
                this.models.set(sDataSourceName, oModel);
            }
            return this.models.get(sDataSourceName);
        }
    };
});
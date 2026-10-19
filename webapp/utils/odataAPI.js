sap.ui.define([
    "sap/ui/base/Object",
], function (Object) {
    "use strict";
    return Object.extend("ar.com.relesa.shipment.planning.utils.odataAPI", {
        constructor: function (model) {
            this.model = model;
        },
        returnData: function(resolve, reject, mParameters){
            return {
                
                parameters : !!mParameters ? mParameters.parameters : '',
                filters: !!mParameters ? mParameters.filters : '',
                sorters: !!mParameters ? mParameters.sorters : '',
                urlParameters: !!mParameters ? mParameters.urlParameters : '',
                success: function(data,header) {
                    resolve(header);
                },  
                error: function(oError,header) {
                     reject(oError);
                }
            };
        },
        returnFunction: function (resolve, reject, mParameters) {
            return {
                method: !!mParameters ? mParameters.method : 'GET',
                urlParameters: !!mParameters ? mParameters.urlParameters : {},
                success: function (data, header) {
                    resolve(header)
                },
                error: function(oError,header) {
                    reject(oError)
                }
            }

        },        
        create: function(sPath, payload){
            return new Promise(function(resolve, reject){
                this.model.create(sPath, payload, this.returnData(resolve, reject));
            }.bind(this));
        },
        read: function(sPath, mParameters) {
            return new Promise(function (resolve, reject) {
                this.model.read(sPath, this.returnData(resolve, reject, mParameters));
            }.bind(this));
        },
        update: function(sPath, payload){
            return new Promise(function(resolve, reject){
                this.model.update(sPath, payload, this.returnData(resolve, reject));
            }.bind(this));
        },
        delete: function(sPath){
            return new Promise(function(resolve, reject){
                this.model.remove(sPath, this.returnData(resolve, reject));
            }.bind(this));
        },
        callFunction: function (sPath, mParameters) {
            return new Promise(function (resolve, reject) {
                this.model.callFunction(sPath, this.returnFunction(resolve, reject, mParameters))
            }.bind(this))
        }        
    });
});
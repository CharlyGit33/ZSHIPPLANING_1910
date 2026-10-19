sap.ui.define([
    "sap/ui/base/EventProvider"
], function (EventProvider) {
    "use strict";

    var instance = null,
        BarcodeScanner = EventProvider.extend("ar.com.relesa.shipment.planning.model.BarcodeScanner", {
            metadata: {
                events: {
                    scanned: {
                        parameters: {
                            barcode: { type: "string" }
                        }
                    }
                }
            },
            prefix: "",
            constructor: function () {
                EventProvider.apply(this);
                this.initialize();
            }
        });

    BarcodeScanner.prototype.activate = function () {
        if (!this.active) {
            this.active = true;
            console.log("Class: BarcodeScanner, Method: activate");
            $(document).keypress(this.scan.bind(this));
        }
    };

    BarcodeScanner.prototype.deactivate = function () {
        if (this.active) {
            console.log("Class: BarcodeScanner, Method: deactivate");
            this.initialize();
        }
    };

    BarcodeScanner.prototype.initialize = function () {
        this.active = false;
        this.mEventRegistry = {};
        this.resetScan();
        $(document).unbind("keypress");
        console.log("Class: BarcodeScanner, Method: initialize");
    };

    BarcodeScanner.prototype.isScanStarted = function () {
        return this.barcodePrefix === this.getPrefix();
    };

    BarcodeScanner.prototype.resetScan = function () {
        this.barcode = "";
        this.barcodePrefix = "";
    };

    // Deberia estar configurado fijo en la clase o en todo caso tomarlo de un servicio
    BarcodeScanner.prototype.setPrefix = function (prefix) {
        this.prefix = prefix;
    };

    BarcodeScanner.prototype.getPrefix = function () {
        return this.prefix;
    };

    BarcodeScanner.prototype.scan = function (event) {
        if (event.keyCode === 9 || event.keyCode === 13) {
            console.log("Class: BarcodeScanner, Method: scan, Data: [Barcode: " + this.barcode + "]");
            this.fireEvent("scanned", {
                barcode: this.barcode
            });
            this.resetScan();
        } else {
            this.barcode += event.key;
        }
    };

    BarcodeScanner.prototype.attachScanned = function (fnFunction, oListener) {
        console.log("Class: BarcodeScanner, Method: attachScanned");
        this.attachEvent("scanned", {}, fnFunction, oListener);
    };

    BarcodeScanner.prototype.detachScanned = function (fnFunction, oListener) {
        console.log("Class: BarcodeScanner, Method: detachScanned");
        this.detachEvent("scanned", {}, fnFunction, oListener);
    };

    return {
        getInstance: function () {
            if (!instance) {
                instance = new BarcodeScanner();
            }
            return instance;
        }
    };
});
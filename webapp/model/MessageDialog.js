sap.ui.define([
    "sap/ui/base/EventProvider"
], function (UI5Object) {
    "use strict";

    var instance = null,
        MessageDialog = UI5Object.extend("ar.com.relesa.shipment.planning.model.MessageDialog", {
            constructor: function () {
                UI5Object.apply(this);
                this.init();
            }
        });

    MessageDialog.prototype.init = function () {
        var that = this;
        this._oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
        var oMessageManager = sap.ui.getCore().getMessageManager();

        oMessageManager.registerMessageProcessor(this._oMessageProcessor);
        var oMessageTemplate = new sap.m.MessageItem({
            description: "{description}",
            type: "{type}",
            subtitle: '{description}',
            title: "{message}"
        });

        var oBackButton = new sap.m.Button({
            icon: sap.ui.core.IconPool.getIconURI("nav-back"),
            visible: false,
            press: function () {
                that._oMessageView.navigateBack();
                this.setVisible(false);
            }
        });

        this._oMessageView = new sap.m.MessageView({
            showDetailsPageHeader: false,
            itemSelect: function () {
                oBackButton.setVisible(true);
            },
            items: {
                path: "/",
                template: oMessageTemplate
            }
        });

        this._oMessageView.setModel(oMessageManager.getMessageModel());
        this._oDialog = new sap.m.Dialog({
            customHeader: new sap.m.Bar({
                contentRight: [
                    new sap.m.Button({
                        icon: "sap-icon://decline",
                        press: function (oEvent) {
                            oEvent.getSource().getParent().getParent().close();
                        }
                    })
                ],
                contentMiddle: [
                    new sap.m.Title({
                        text: "Mensajes"
                    })
                ],
                contentLeft: [oBackButton]
            }),
            resizable: true,
            content: this._oMessageView,
            state: "Error",
            contentHeight: "300px",
            contentWidth: "500px",
            verticalScrolling: false
        }).attachAfterClose({}, function () {
            sap.ui.getCore().getMessageManager().removeAllMessages();
            that.fireEvent("closed");
        }, this).attachBeforeClose({}, function () {
            that._oMessageView.navigateBack();
        }, this);
        this._oDialog.setModel(oMessageManager.getMessageModel());
    };

    MessageDialog.prototype.getResourceBundle = function () {
        if (!this._oResourceModel) {
            this._oResourceModel = new sap.ui.model.resource.ResourceModel({
                bundleName: "ar.com.relesa.shipment.planning.i18n.i18n",
                supportedLocales: [
                    "es",
                    "en"
                ],
                fallbackLocale: "es"
            });
        }
        return this._oResourceModel.getResourceBundle();
    };

    MessageDialog.prototype.showMessage = function () {
        if (this._oDialog.isOpen()) {
            return;
        }
        this._oDialog.open();
    };

    MessageDialog.prototype.addBatchResponseError = function (oResponse) {
        sap.ui.getCore().getMessageManager().removeAllMessages();
        let oErrorReponses = oResponse.__batchResponses.filter(function (oBatchResponse) {
            return oBatchResponse.response && !oBatchResponse.response.statusCode.startsWith("2");
        }).map(function (oBatchResponse) {
            return this.parseMessage(oBatchResponse.response.body);
        }.bind(this)).reduce(function (aAccumulator, oBatchResponse) {
            if (oBatchResponse.error.innererror && oBatchResponse.error.innererror.errordetails.length > 0) {
                aAccumulator = aAccumulator.concat(oBatchResponse.error.innererror.errordetails);
            } else {
                aAccumulator = aAccumulator.concat(oBatchResponse.error);
            }
            return aAccumulator;
        }, []);
        oErrorReponses.forEach(function (oErrorMessage) {
            this.addMessage(oErrorMessage, sap.ui.core.MessageType.Error);
        }.bind(this));
        this.showMessage();
    };

    MessageDialog.prototype.addResponse = function (oResponse) {
        sap.ui.getCore().getMessageManager().removeAllMessages();
        if (oResponse.responseText) {
            const oJsonResponse = this.parseMessage(oResponse.responseText);
            let aMessages = []

            if (oJsonResponse.error) {
                aMessages.push(oJsonResponse.error)
            }

            if (oJsonResponse.error.innererror && oJsonResponse.error.innererror.errordetails && oJsonResponse.error.innererror.errordetails.length > 0) {

                aMessages = aMessages.concat(oJsonResponse.error.innererror.errordetails)

            }
            aMessages.forEach(function (oMessage) {
                this.addMessage(oMessage, sap.ui.core.MessageType.Error);
            }.bind(this));
            this.showMessage();
        }
    };

    MessageDialog.prototype.addMessagesFromArray = function (aMessages) {
        sap.ui.getCore().getMessageManager().removeAllMessages();
            aMessages.forEach(function (oMessage) {
                this.addMessage(oMessage, sap.ui.core.MessageType.Error);
            }.bind(this));
            this.showMessage();
        
    };

    MessageDialog.prototype.addFunctionError = function (oResponse) {
        sap.ui.getCore().getMessageManager().removeAllMessages();
        if (oResponse.responseText) {
            const oError = this.parseMessage(oResponse.responseText);
            this.addMessage(oError.error, sap.ui.core.MessageType.Error);
            this.showMessage();
        }
    };

    MessageDialog.prototype.addMessage = function (oMessage, sType) {
        if (oMessage.code !== 'SY/530' && oMessage.code !== '/IWBEP/CX_MGW_BUSI_EXCEPTION') {

        
            const  getType = {
                'error':  sap.ui.core.MessageType.Error,
                'Error': sap.ui.core.MessageType.Error,
                'warning':  sap.ui.core.MessageType.Warning,
                'info':  sap.ui.core.MessageType.Information,
                'success':  sap.ui.core.MessageType.Success
            }

            let sTypeMessage = getType[oMessage.severity ? oMessage.severity : oMessage.type ]

            sTypeMessage = sTypeMessage ? sTypeMessage : sap.ui.core.MessageType.Error


            sap.ui.getCore().getMessageManager().addMessages(
                new sap.ui.core.message.Message({
                    code: oMessage.code,
                    message: oMessage.code,
                    description: oMessage.message,
                    type: sTypeMessage, //sap.ui.core.MessageType.Error,
                    processor: this._oMessageProcessor
                })
            );
        }
    };

    MessageDialog.prototype.parseMessage = function (sMessage) {
        let oErrorMessage = {};
        if (sMessage.startsWith("<")) {
            oErrorMessage = this.parseXml(sMessage);
        } else {
            oErrorMessage = JSON.parse(sMessage);
            oErrorMessage = {
                error: {
                    ...oErrorMessage.error,
                    message: oErrorMessage.error.message.value
                }
            };
        }
        return oErrorMessage;
    };

    MessageDialog.prototype.parseXml = function (sMesssage) {
        let parser = new DOMParser(),
            xmlDoc = parser.parseFromString(sMesssage, "text/xml");

        return {
            error: {
                code: xmlDoc.getElementsByTagName("code")[0].childNodes[0].nodeValue,
                message: xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue
            }
        };
    };

    return {
        getInstance: function () {
            if (!instance) {
                instance = new MessageDialog();
            }
            return instance;
        }
    };
});
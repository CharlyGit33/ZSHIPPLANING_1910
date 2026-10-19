sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"../model/MessageDialog",
	"sap/ui/core/Fragment",
	"../utils/odataAPI",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
], function (Controller, History, MessageDialog, Fragment, odataAPI,Filter,FilterOperator,JSONModel) {
	"use strict";

	return Controller.extend("ar.com.relesa.shipment.planning.controller.BaseController", {
		fragments: new Map(),

		onInit: function () {
			/*			this.getRouter().attachRoutePatternMatched(function () {
							Scanner.getInstance().deactivate();
						}, this);*/
		},

		onExit: function () {
			this.fragments.forEach(function (fragment, fragmentName, fragments) {
				fragment.destroy();
				fragments.delete(fragmentName);
			});
		},

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		
        getOdataModel: function (sName) {
           
            let oData = new odataAPI(this.getModel(sName));
         
            return oData
        },

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		getMessageDialog: function () {
			return MessageDialog.getInstance();
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


		getCurrentShipment: async function(sShipment,sOrg,sFecha) {
			let aFilter = []
			//const oFilter =  this.getOwnerComponent().getModel('filterModel').getObject("/multiples")
			//const aFilterData = this.getFilters(oFilter)

			//aFilterData ? aFilter = aFilterData : aFilter.push(new Filter('shipmentId',FilterOperator.EQ,sShipment))
			aFilter.push(new Filter('shipmentId',FilterOperator.EQ,sShipment))		
			aFilter.push(new Filter('salesOrganizationId',FilterOperator.EQ,sOrg))
			aFilter.push(new Filter('shipmentDate',FilterOperator.EQ,sFecha))
			await this._getShipment(aFilter)
		},

		_getShipment: async function(aFilters) {			
			const oParams = {
				filters: aFilters ? aFilters : []
			}
			const oRead = this.getOdataModel('ShipmentService').read('/planningShipments',oParams)

			await oRead.then( (response) => {
				const oModel = new JSONModel()
				oModel.setData(response.data.results)
				this.getOwnerComponent().setModel(oModel,'shipments')
			})

		},

		getFilters: function (oFilters) {
			return Object.keys(oFilters).filter(function (sKey) {
				return oFilters[sKey] !== null && oFilters[sKey] !== "";
			}).map(function (sKey) {
				let filters = null;
				if (Array.isArray(oFilters[sKey])) {
					filters = new Filter(oFilters[sKey].map(function (value) {
						return new Filter(sKey, FilterOperator.EQ, value);
					}), false);
				} else {
					filters = new Filter(sKey, FilterOperator.EQ, oFilters[sKey]);
				}
				return filters;
			}).filter((e) => {
				return !e._bMultiFilter || ( e._bMultiFilter  && !!e.aFilters.length  )
			})
		},


		getFragment: function (sFragmentName) {
			let oPromise = null;
			if (!this.fragments.has(sFragmentName)) {
				oPromise = Fragment.load({
					id: this.getView().getId(),
					name: "ar.com.relesa.shipment.planning.view.fragments." + sFragmentName,
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this.fragments.set(sFragmentName, oDialog);
					return oDialog;
				}.bind(this));
			} else {
				oPromise = Promise.resolve(this.fragments.get(sFragmentName));
			}
			return oPromise;
		},

		// ===== ADAPTACION CRUD/DEEP ENTITY: switch global de prueba =====
		// Helper compartido por todos los controllers (BaseController es superclase de
		// PalletDetail.controller.js y ShipmentDetail.controller.js). Lee el modelo
		// "testMode" seteado a nivel Component (ver Component.js) y determina si la
		// app debe usar las funciones CRUD nuevas (checkUncheckSet deep entity) o las
		// funciones Function Import originales ("legacy").
		// Devuelve true (modo CRUD) por defecto si por algún motivo el modelo no está
		// disponible, para no romper el comportamiento que ya estaba activo antes de
		// agregar este switch.
		_isCRUDModeOn: function () {
			var oOwnerComponent = this.getOwnerComponent && this.getOwnerComponent();
			var oTestModeModel = oOwnerComponent && oOwnerComponent.getModel("testMode");
			if (!oTestModeModel) {
				return true;
			}
			var bUseCRUD = oTestModeModel.getProperty("/useCRUD");
			return bUseCRUD !== false;
		}

	});

});
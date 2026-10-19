sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/Device",
	"../services/UserService",
	"../model/formatter",
	"../model/configurations",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, Filter, FilterOperator, Device, UserService, formatter, configurations, MessageToast) {
	"use strict";

	return BaseController.extend("ar.com.relesa.shipment.planning.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function () {
			console.log("Versión: 1.0.45 - Ultimo cambio el 31/12/2024")
			//BaseController.prototype.onInit.apply(this, arguments);
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oList = oList;
			this._oListTemplate = oList.getBindingInfo("items").template;
			//this._oList.unbindItems();

			//PRUEBA
			this.getFragment("Filter");
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};


			/// 
			var oDataModel = this.getOwnerComponent().getModel();//= new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/YOUR_SERVICE_NAME/");

			oDataModel.attachRequestFailed(function (oEvent) {
				var oResponse = oEvent.getParameter("response");
				// var sErrorMessage = "An unexpected error occurred.";

				// if (oResponse && oResponse.responseText) {
				//     try {
				//         var oErrorDetails = JSON.parse(oResponse.responseText);
				//         if (oErrorDetails.error && oErrorDetails.error.message && oErrorDetails.error.message.value) {
				//             sErrorMessage = oErrorDetails.error.message.value; // Extract business message
				//         }
				//     } catch (e) {
				//         // Handle cases where responseText is not valid JSON
				//         sErrorMessage = oResponse.responseText;
				//     }
				// }

				// sap.m.MessageBox.error(sErrorMessage, {
				//     title: "Business Error"
				// });
			});

			///


			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			//oList.attachEventOnce("updateFinished", function () {
			// Restore original busy indicator delay for the list

			//	oViewModel.setProperty("/delay", iOriginalBusyDelay);
			//});

			this._initModels();

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
			/* 
						var that = this;
						setInterval(function(){
							that._refrescarMondelo();
						  }, 1000); */
		},

		onBeforeRendering: async function () {
			const oShell = sap.ushell
			const oContainer = oShell ? sap.ushell.Container : null
			const oUserInfo = oContainer ? oContainer.getService("UserInfo").getId() : null
			const sUserId = oUserInfo
			this.getModel('masterView').setProperty('/busy', true)
			UserService.getUserParameter(sUserId, "ZZPLYSTA").then(async function (oData) {
				const oModel = this.getModel("filterModel");
				oModel.setProperty("/multiples/yardStatus", [oData.value]);
				// this._oList.bindItems({
				// 	path: "ShipmentService>/planningShipments",Shipment
				// 	template: this._oListTemplate,
				// 	filters: this.getFilters(oModel.getObject("/multiples"))
				// });
				const aFilters = this.getFilters(oModel.getObject("/multiples"))
				await this._getShipment(aFilters)

				this.getModel('masterView').setProperty('/busy', false)
				//this.getOwnerComponent().oListSelector.setBoundMasterList(this._oList);
			}.bind(this));
		},


		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		onSuggest: function (oEvent) {
			var sTerm = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sTerm) {
				aFilters.push(new Filter("vendorName", FilterOperator.StartsWith, sTerm));
			}

			oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
		},

		onSuggestionItemSelected: function (oEvent) {
			var oItem = oEvent.getParameter("selectedItem");
			var sKey = oItem ? oItem.getKey() : null;
			this.getModel("filterModel").setProperty("/multiples/forwardingAgentId", sKey);
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query"),
				oFilters = null;
			if (sQuery) {
				oFilters = this.getModel("filterModel").getObject("/individual");
			} else {
				oFilters = this.getModel("filterModel").getObject("/multiples");
			}

			const aFilters = this.getFilters(oFilters);
			this._applyFilterSearch(aFilters);

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onFilterPress: function (oEvent) {
			this._oFiltersBackup = $.extend(true, {}, this.getModel("filterModel").getObject("/multiples"));
			this.getFragment("Filter").then(function (oFragment) {
				oFragment.open();
			});
		},

		onFilterConfirm: function () {
			this.getFragment("Filter").then(function (oFragment) {
				const aFilters = this.getFilters(this.getModel("filterModel").getObject("/multiples"));
				this._applyFilterSearch(aFilters);
				oFragment.close();
			}.bind(this));
		},
		_refrescarMondelo: function () {


			this.getFragment("Filter").then(function (oFragment) {
				const aFilters = this.getFilters(this.getModel("filterModel").getObject("/multiples"));
				this._applyFilterSearch(aFilters);
			}.bind(this));
		},

		onFilterCancel: function () {
			this.getFragment("Filter").then(function (oFragment) {
				this.getModel("filterModel").setProperty("/multiples", this._oFiltersBackup);
				oFragment.close();
			}.bind(this));
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key
			});
		},

		getMaterialFamilyGroup: function (oContext) {
			return oContext.getProperty("materialFamiliyDescription");
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_initModels: function () {
			this.getOwnerComponent().setModel(new JSONModel($.extend(true, {}, configurations.defaultFilters)), "filterModel");
		},

		_createViewModel: function () {
			return new JSONModel({
				currentOrg: '',
				missing: false,
				busy: false,
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText")
			});
		},


		onMostrarFaltantes: function () {
			const oFilter = this.getModel('filterModel').getObject("/multiples")


			const oParams = {
				urlParameters: {
					Date: this.formatter.formatDatePure(oFilter.shipmentDate)
				}
			}
			const oFaltante = this.getOdataModel().callFunction('/getFaltante', oParams)
			this.getModel('masterView').setProperty('/busy', true)
			oFaltante.then((response) => {
				const oModel = new JSONModel()
				oModel.setData(response.data.results)
				this.getModel('masterView').setProperty('/missing', true)
				this.getOwnerComponent().setModel(oModel, 'shipments')
			}).finally(() => this.getModel('masterView').setProperty('/busy', false))
				.catch(() => {
					MessageToast.show('No se encontraron viajes con faltantes')
				})
		},

		onPalletCancel: function (oEvent) {
			oEvent.getSource().getParent().close()
		},

		onPalletSelect: function (oEvent) {
			const oItemSelected = oEvent.getParameter('listItem')
			if (!oItemSelected) {
				return
			}
			const oItem = oItemSelected.getBindingContext('palletsFaltantes').getObject()
			const sOrg = this.getModel('masterView').getProperty('/currentOrg')
			oEvent.getSource().getParent().close()
			this._navToComponent(oItem.shipmentId, sOrg, oItem.plantId, oItem.shipmentDate, oItem.shipmentType, oItem.palletId)


		},

		_navToComponent: function (sId, sOrg, sPlant, sFecha, sType, sPallet) {
			this.getRouter().navTo("palletDetail", {
				shipmentId: sId,
				salesOrganizationId: sOrg,
				plantId: sPlant,
				shipmentDate: JSON.stringify(sFecha).replaceAll("\"", ""),
				shipmentType: sType,
				palletId: sPallet
			});
		},

		_onMasterMatched: function () {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
			this._oList.removeSelections(true);

		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function (oItem) {
			const oShipment = oItem.getBindingContext("shipments").getObject();
			this._navToDetail(oShipment.shipmentId, oShipment.salesOrganizationId, oShipment.shipmentDate);

			/*
			const bMissing = this.getModel('masterView').getProperty('/missing');
			if (!bMissing) {
				this._navToDetail(oShipment.shipmentId, oShipment.salesOrganizationId, oShipment.shipmentDate);
			} else {
				this._MostrarPalletsFaltantes(oShipment.shipmentId, oShipment.plantId, oShipment.shipmentDate, oShipment.salesOrganizationId);
			}
			*/
		},

		_navToDetail: function (sId, sOrg, sDate) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("shipmentDetail", {
				shipmentId: sId,
				salesOrganizationId: sOrg,
				shipmentDate: JSON.stringify(sDate).replaceAll("\"", "")
			}, bReplace);
		},

		_MostrarPalletsFaltantes: function (sId, sPlant, sDate, sOrg) {
			this.getModel('masterView').setProperty('/currentOrg', sOrg)
			this._oList.removeSelections(true);
			const oParams = {
				urlParameters: {
					Viaje: sId,
					OrganizationId: sPlant,
					Date: this.formatter.formatDatePure(sDate)
				}
			}
			const oFaltante = this.getOdataModel().callFunction('/getPalletFaltante', oParams)
			this.getModel('masterView').setProperty('/busy', true)
			oFaltante.then((response) => {
				const aData = response.data.results
				const oModel = new JSONModel()
				oModel.setData(aData)
				this.setModel(oModel, 'palletsFaltantes')

				if (aData.length == 1) {
					const sOrg = this.getModel('masterView').getProperty('/currentOrg')
					const oItem = aData[0]
					this._navToComponent(
						oItem.shipmentId,
						sOrg, oItem.plantId,
						oItem.shipmentDate,
						oItem.shipmentType,
						oItem.palletId)
				} else {
					this._showPalletList()
				}
			}).finally(() => this.getModel('masterView').setProperty('/busy', false))
		},

		_showPalletList: function () {
			this.getFragment('palletList').then((oFragment) => {
				oFragment.open()
			})
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: async function (aFilters) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty('/missing', false)
			// this._oList.getBinding("items").filter(aFilters, "Application");
			await this._getShipment(aFilters)
			this.getModel('masterView').setProperty('/busy', false)
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		}







	});

});
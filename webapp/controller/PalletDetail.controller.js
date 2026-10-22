sap.ui.define([
	"./BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Sorter",
	"../model/formatter",
	"../services/ShipmentService",
	"sap/ui/Device",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, History, JSONModel, Sorter, formatter, ShipmentService, Device, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("ar.com.relesa.shipment.planning.controller.PalletDetail", {
		formatter: formatter,
		mGroupFunctions: {
			materialFamily: function (oContext) {
				const oComponent = oContext.getObject();
				return {
					key: oComponent.materialFamily,
					text: oComponent.materialFamilyDescription
				}
			},
			floor: function (oContext) {
				const oComponent = oContext.getObject();
				return {
					key: oComponent.floor,
					text: oComponent.floor
				}
				//				return oContext.getProperty("floor");
			}
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			//BaseController.prototype.onInit.apply(this, arguments);
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				palletBusy: false,
				componentBusy: false,
				delay: 0
			});

			this.getRouter().getRoute("palletDetail").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "palletView");
			this.setModel(this.getOwnerComponent().getModel("ShipmentService"), "ShipmentService");
			this.getFragment("Group");
			this.getOwnerComponent().getModel("ShipmentService").metadataLoaded().then(this._onMetadataLoaded.bind(this));



			var PALLETID = null;
			var PACKSPORFAMILIA;
			var FECHAVIAJE;
			this.NOIRATRAS;

			var that = this;
			
			//Buffer Seleccionados
			this.SELECCIONADOS = [];
			// Buffer Auxiliar Seleccionados, para evitar problemas de asincronia en la seleccion 
			// y deseleccion rapida de componentes
			this.filterSeleccionados = [];
			//Buffer de Materiales con Error
			this.materialsError = [];
			//Flag para controlar proceso despues de error, 
			// si se produce un error al seleccionar un componente, 
			// se bloquea la posibilidad de mostrar multiples mensajes de error y 
			// se controla que el proceso de guardado solo se ejecute una vez
			this.ProcessAfterError = false;

			//Flag para ERROR MENSAJE RECURRENTE
			this.BlockedMessage = false;

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onPalletPress: function (oEvent) {
			var oGridList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oGridList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oGridList);
			}
		},

		onNavToShipment: function () {
			//console.log("onNavToShipment")
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this._showShipmentDetail();
			}
		},

		onGroupOpenPress: function () {
			this.getFragment("Group").then(function (oViewSettingsDialog) {
				oViewSettingsDialog.open();
			});
		},

		onGroupConfirmPress: function (oEvent) {
			var oGridList = this.byId("list.components"),
				mParams = oEvent.getParameters(),
				oBinding = oGridList.getBinding("items"),
				sPath,
				bDescending,
				vGroup,
				aGroups = [];

			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				vGroup = this.mGroupFunctions[sPath];
				aGroups.push(new Sorter(sPath, bDescending, vGroup));
				// apply the selected group settings
			} else if (this.groupReset) {
				this.groupReset = false;
			}
			aGroups.push(new Sorter("materialId", false));
			oBinding.sort(aGroups);
		},
		setInputFields: function () {
			var inputs = window.document.querySelectorAll('.sapMInputBaseInner');
			if (inputs && inputs.length > 0) {
				for (var index = 0; index < inputs.length; index++) {
					var input = inputs[index];
					if (input.placeholder != 'dd/MM/yyyy' && input.placeholder != "por ejemplo 31/12/2023" && input.role != "combobox") {
						input.classList.add("kioskboard");
					}

					if (input.type == 'text') {
						input.dataset.kioskboardType = 'all';
					}
					if (input.type == 'password') {
						input.dataset.kioskboardType = 'all';
					}
					if (input.type == 'number') {
						input.dataset.kioskboardType = 'numpad';
					}
					if (input.type == 'search') {
						input.dataset.kioskboardType = 'all';
					}



					input.dataset.kioskboardPlacement = 'bottom';
					input.dataset.kioskboardSpecialcharacters = 'true';
				}
			}


			var selectdialogs = window.document.querySelectorAll('.sapMSFI');
			if (selectdialogs && selectdialogs.length > 0) {
				for (var index = 0; index < selectdialogs.length; index++) {
					var selectdialog = selectdialogs[index];
					selectdialog.classList.add("kioskboard");

					if (selectdialog.type == 'text') {
						selectdialog.dataset.kioskboardType = 'all';
					}
					// if (selectdialog.type == 'search') {
					// 	selectdialog.dataset.kioskboardType = 'all';
					// }
					if (selectdialog.type == 'password') {
						selectdialog.dataset.kioskboardType = 'all';
					}
					if (selectdialog.type == 'number') {
						selectdialog.dataset.kioskboardType = 'numpad';
					}

					selectdialog.dataset.kioskboardPlacement = 'bottom';
					selectdialog.dataset.kioskboardSpecialcharacters = 'true';
				}
			}
		},

		resetGroupDialog: function (oEvent) {
			this.groupReset = true;
		},


		_getLocation: async function () {
			await $.ajax({
				url: "https://ws.relesa.com.ar/getMyLocacion.php",
				async: true,
				type: 'GET',
				datetype: 'JSON',
				accept: { text: 'application/json' },
				success: function (oRes) {
					if (oRes) {
						const sRes = JSON.parse(oRes)
						this.sLocation = sRes.ALMACEN_MKT
						this.sStore = sRes.ALMACEN_ENV
					}

				}.bind(this)
			})
		},

		_updateBindingShipment: function () {
			const oHeader = this.getView().getElementBinding('ShipmentService').getBoundContext().getObject()
			const sId = oHeader.shipmentId
			const sOrg = this.salesOrganizationId
			const sDate = oHeader.shipmentDate
			this.getCurrentShipment(sId, sOrg, sDate)
		},
		_onPalletComponentSelect: async function (oComponent) {
			const oViewModel = this.getModel("palletView"),
				sFunctionName = (oComponent.statusId === 'pending' || oComponent.statusId === '') ? "check" : "uncheck";
			//oViewModel.setProperty('/palletBusy',true)
			const oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyyMMddHHmmss", UTC: true });
			//await this._getLocation()
			ShipmentService.callODataFunction(sFunctionName, {
				materialId: oComponent.materialId,
				floor: oComponent.floor,
				palletId: oComponent.palletId,
				shipmentType: oComponent.shipmentType,
				shipmentDate: oDateFormat.format(oComponent.shipmentDate),
				plantId: oComponent.plantId,
				shipmentId: oComponent.shipmentId,
				marketingStorageLocation: this.sLocation,
				salesOrganizationId: this.salesOrganizationId,
				packagingStorageLocation: this.sStore,
				palletType: oComponent.palletType,
				yardStatus: oViewModel.oData.yardStatus

			}).then(function () {
				return ShipmentService.read(this.getView().getBindingContext("ShipmentService").getPath()).then(async function () {
					const oData = this.getView().getBindingContext("ShipmentService").getObject();
					oViewModel.setProperty("/palletStatus", oData.palletStatus);
					if (this.formatter.getRelevantStatusCondition(oViewModel.getProperty("/yardStatus"), this.getView().getBindingContext("ShipmentService").getObject("palletStatus"))) {

						var that = this;
						/////////OPCION 1
						console.log("NOIRATRAS = FALSE después de actualizar componentes")
						this.NOIRATRAS = false;
						that._showShipmentDetail();

					}
					this.byId("list.components").getBinding("items").refresh();

				}.bind(this));



			}.bind(this)).catch(function (oError) {
				console.log(oError)
				console.log("NOIRATRAS = TRUE -  Error en _onPalletComponentSelect")
				this.NOIRATRAS = true;
				var that = this;
				if (oError.responseText) {
					let errorResponse = JSON.parse(oError.responseText);
					if (errorResponse.error.innererror && errorResponse.error.code === 'SY/530' && errorResponse.error.innererror.errordetails.length > 0) {

						let errorDetails = errorResponse.error.innererror.errordetails;

						for (let errorD of errorDetails) {
							if (errorD.code !== '/IWBEP/CX_MGW_BUSI_EXCEPTION') {
								if (errorD.code === 'M3/020' || errorD.code === 'M3/022' || errorD.code === 'M7/097' || errorD.code === 'M3/682') {
									if (!this.BlockedMessage) {
										sap.m.MessageBox.error(errorD.message);
										this.BlockedMessage = true;
										this.ProcessAfterError = true;
										break;
									}
								} else {
									let messageDetail = errorD.message.split(':')[1];
									if (messageDetail) { messageDetail = messageDetail.trimStart() }
									let materialId = messageDetail.split(' ')[0];
									let floor = messageDetail.split(' ')[2] ? messageDetail.split(' ')[2] : '000';
									if (materialId == undefined || materialId == null || materialId == '') { materialId = messageDetail }

									materialId = parseInt(materialId).toString();

									let matError = { materialId: materialId, floor: floor }
									let findMatError = this.materialsError.filter(mat => mat.materialId == materialId && mat.floor == floor);

									if (findMatError.length == 0) {
										this.filterSeleccionados = this.SeleccionadosAux.filter(sel => sel.materialId !== materialId && sel.floor !== floor);
										this.SeleccionadosAux = this.filterSeleccionados;
										this.SELECCIONADOS = this.SeleccionadosAux;
										this.materialsError.push(matError);
										//Mostrar Error
										this.getMessageDialog().addResponse(oError);
									}
								}

							}
						}

						if (!this.ProcessAfterError) {
							this.onGuardar(null)
							this.ProcessAfterError = true;
						}
					}
					//Error generico
					else {
						this.getMessageDialog().addResponse(oError);
					}

				}
			}.bind(this)).finally(async function () {
				///////
				let oItems = this.byId("list.components").getItems();//getBinding("items");
				for (let item of oItems) {
					let aObject = item.getBindingContext("ShipmentService").getObject();

					if (item.mAggregations.content && aObject.materialId !== '') {
						if (this.SeleccionadosAux.find(sel => sel.materialId === aObject.materialId)) {
							item.mAggregations.content[0].mAggregations.items[1].mAggregations.items[0].setPressed(true);
						}
					}
				}
				this.SELECCIONADOS = this.SeleccionadosAux;
				this.materialsError = [];

			}.bind(this));
		},

		onSelectionChange: async function (oEvent) {

			const oComponent = oEvent.getSource().getBindingContext("ShipmentService").getObject();

			//NUEVO DESARROLLO - Logica que evita Buffer de seleccionados, 
			// ahora se compara el objeto seleccionado con los que ya estan en el array de seleccionados, 
			// si esta se elimina y si no esta se agrega, esto hace que el array de seleccionados 
			// siempre tenga el estado correcto sin importar la cantidad de clicks o la velocidad de los mismos
			const bPressed = oEvent.getParameter("pressed");
			const bInitiallyPressed = this.formatter.getRelevantStatusCondition(
				this.getModel("palletView").getProperty("/yardStatus"),
				oComponent.statusId
			);
			const bHasPendingChange = bPressed !== bInitiallyPressed;
			const iSelectedIndex = this.SELECCIONADOS.findIndex(function (oSelected) {
				return oSelected.shipmentId === oComponent.shipmentId &&
					oSelected.plantId === oComponent.plantId &&
					oSelected.shipmentDate === oComponent.shipmentDate &&
					oSelected.shipmentType === oComponent.shipmentType &&
					oSelected.palletId === oComponent.palletId &&
					oSelected.floor === oComponent.floor &&
					oSelected.materialId === oComponent.materialId;
			});

			if (!bHasPendingChange) {
				if (iSelectedIndex !== -1) {
					this.SELECCIONADOS.splice(iSelectedIndex, 1);
				}
			} else if (iSelectedIndex === -1) {
				this.SELECCIONADOS.push(oComponent);
			} else {
				this.SELECCIONADOS[iSelectedIndex] = oComponent;
			}

			this.SeleccionadosAux = this.SELECCIONADOS;
		},

		onGuardar: async function (oEvent) {
			//Mensajes de bloqueo inicial
			this.BlockedMessage = false;
			if (oEvent) { this.ProcessAfterError = false; }
			var oViewModel = this.getModel("palletView");
			oViewModel.setProperty("/palletBusy", true);
			let oButton = this.byId("idBtnGuardar"); //oEvent.getSource();
			oButton.setBusy(true);
			console.log("NOIRATRAS = TRUE -  desde onGuardar")

			this.NOIRATRAS = true;
			var that = this;
			let selectedItems = that.getView().byId("list.components").getSelectedItems()
			var oView = that.getView();

			//EVITAR ERROR ENTRE SELECION DE COMPONENTES Y PALLET
			let sPallet = this.getView().byId("list.components").getBindingContext('ShipmentService').getObject();
			let sPalletId = sPallet.palletId;
			this.SELECCIONADOS = this.SELECCIONADOS.filter(sel => sel.palletId === sPalletId);
			this.SeleccionadosAux = this.SELECCIONADOS;
			//FIN EVITAR ERROR ENTRE SELECION DE COMPONENTES Y PALLET

			if (this.SELECCIONADOS.length != 0) {

				oView.setBusy(true);

				//ORDENAR PRIMERO LOS UNCHECK
				this.SELECCIONADOS.sort(function (a, b) {
					if (a.statusId != "checked") {
						return 1;
					}
					if (a.statusId == "checked") {
						return -1;
					}
				});

				console.log("antes del for each")
				this.SELECCIONADOS.forEach(async item => {
					console.log("dentro del for each")
					await this._onPalletComponentSelect(item)
				});
				oView.setBusyIndicatorDelay(0);

				// setTimeout(function(){
				console.log("despues del for each")
				console.log("valor de NOIRATRAS ANTES DE VALIDAR ES " + that.NOIRATRAS)
				if (!that.NOIRATRAS) {
					that.onNavToShipment()
				}

				setTimeout(function () {
					oView.setBusy(false);
					if (!that.NOIRATRAS) {
						//that.onNavToShipment()
					}

				}, 6000);


				//}, 6000);
			}
			oButton.setBusy(false);

			this.SELECCIONADOS = [];
			oViewModel.setProperty("/palletBusy", false);
		},

		onGuardarDesdeFaltante: async function () {
			//Mensajes de bloqueo inicial
			this.BlockedMessage = false;
			var that = this;
			let selectedItems = that.getView().byId("list.components").getSelectedItems()
			var oView = that.getView();

			if (this.SELECCIONADOS.length != 0) {

				oView.setBusy(true);
				//ORDENAR PRIMERO LOS UNCHECK

				this.SELECCIONADOS.sort(function (a, b) {
					if (a.statusId != "checked") {
						return 1;
					}
					if (a.statusId == "checked") {
						return -1;
					}
				});

				this.SELECCIONADOS.forEach(async item => {
					await this._onPalletComponentSelect(item)
				});
				oView.setBusyIndicatorDelay(0);

				setTimeout(function () {
					oView.setBusy(false);
				}, 6000);

			}

			this.SELECCIONADOS = [];
		},

		onPalletUncheck: function (oEvent) {
			this.onTooglePallet(oEvent, "palletUncheck");
		},

		onPalletCheck: function (oEvent) {
			this.onTooglePallet(oEvent, "palletCheck");
		},

		onTooglePallet: async function (oEvent, sFunctionName) {

			//EVITAR ERROR ENTRE SELECION DE COMPONENTES Y PALLET
			if (sFunctionName === 'palletUncheck') {
				if (this.SELECCIONADOS) { this.SELECCIONADOS = []; }
				if (this.SeleccionadosAux) { this.SeleccionadosAux = []; }
			}
			//FIN EVITAR ERROR ENTRE SELECION DE COMPONENTES Y PALLET

			const oViewModel = this.getModel("palletView"),
				oView = this.getView(),
				oPallet = oView.getBindingContext("ShipmentService").getObject(),
				oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyyMMddHHmmss", UTC: true });
			let oButton = oEvent.getSource();
			oButton.setBusy(true);
			//await this._getLocation()
			ShipmentService.callODataFunction(sFunctionName, {
				shipmentType: oPallet.shipmentType,
				shipmentId: oPallet.shipmentId,
				shipmentDate: oDateFormat.format(oPallet.shipmentDate),
				plantId: oPallet.plantId,
				palletId: oPallet.palletId,
				salesOrganizationId: this.salesOrganizationId,
				marketingStorageLocation: this.sLocation,
				packagingStorageLocation: this.sStore,
				palletType: oPallet.palletType,
				yardStatus: oViewModel.oData.yardStatus
			}).then(function () {
				this.byId("list.components").getBinding("items").refresh();
			}.bind(this)).catch(function (oError) {
				this.getMessageDialog().addResponse(oError);
			}.bind(this)).finally(function () {
				this.byId("list.components").getBinding("items").refresh();
				const oData = oView.getBindingContext("ShipmentService").getObject();
				oViewModel.setProperty("/palletStatus", oData.palletStatus);
				oButton.setBusy(false);
			}.bind(this));
		},

		onObserverQuantityChange: async function (oEvent) {
			//Carlos Aparicio 20.11.2025
			//this.onGuardarDesdeFaltante();
			//Fin Mod Carlos Aparicio 20.11.2025
			this.getView().setBusy(true)

			const oInput = oEvent.getSource(),
				oListItem = oInput.getParent().getParent().getParent(),
				sPath = oInput.getParent().getBindingContext("ShipmentService").getPath();

			var valorDelInput = oInput.getValue();
			if (valorDelInput == '') {
				valorDelInput = '0';
			}

			if (!(Device.support.touch && valorDelInput == '')) {
				oListItem.setBusy(true);
				try {
					await ShipmentService.updateObservedQuantity(sPath, valorDelInput);
					const oUpdatedComponent = await ShipmentService.read(sPath);
					const iSelectedIndex = this.SELECCIONADOS.findIndex(function (oSelected) {
						return oSelected.palletId === oUpdatedComponent.palletId &&
							oSelected.floor === oUpdatedComponent.floor &&
							oSelected.materialId === oUpdatedComponent.materialId;
					});

					if (iSelectedIndex !== -1) {
						if (oUpdatedComponent.statusId === "missing") {
							this.SELECCIONADOS.splice(iSelectedIndex, 1);
						} else {
							this.SELECCIONADOS[iSelectedIndex] = oUpdatedComponent;
						}
						this.SeleccionadosAux = this.SELECCIONADOS;
					}

					await this._refreshComponentsPreservingSelection();
					sap.m.MessageToast.show("Cantidad observada actualizada correctamente.");
				} catch (oError) {
					console.error("Error al actualizar la cantidad observada:", oError);
					sap.m.MessageBox.error("Fallo al actualizar");
				} finally {
					this.getView().setBusy(false);
					oListItem.setBusy(false);
				}

				//Esto se hace para que no aparezca el teclado de android
				//var field = document.createElement('input');
				//field.setAttribute('type', 'text');
				//document.body.appendChild(field);

			}


		},

		_refreshComponentsPreservingSelection: function () {
			const oList = this.byId("list.components");

			return new Promise(function (resolve) {
				oList.attachEventOnce("updateFinished", function () {
					const aSelected = this.SELECCIONADOS || [];

					oList.getItems().forEach(function (oItem) {
						const oContext = oItem.getBindingContext("ShipmentService");
						const oComponent = oContext && oContext.getObject();
						if (!oComponent || !aSelected.some(function (oSelected) {
							return oSelected.palletId === oComponent.palletId &&
								oSelected.floor === oComponent.floor &&
								oSelected.materialId === oComponent.materialId;
						})) {
							return;
						}

						const oContent = oItem.getContent()[0];
						const oFlexBox = oContent && oContent.getItems().find(function (oControl) {
							return oControl.isA("sap.m.FlexBox");
						});
						const oToggleButton = oFlexBox && oFlexBox.getItems()[0];
						if (oToggleButton) {
							oToggleButton.setPressed(true);
						}
					});
					resolve();
				}, this);

				oList.getBinding("items").refresh();
			}.bind(this));
		},

		onAfterModeChange: function (oEvent) {
			this.getModel("palletView").setProperty("/MultiSelect", oEvent.getParameter("mode") === 'MultiSelect');
		},

		getGroupHeader: function (oGroup) {
			const oPalletContext = this.getView().getBindingContext("ShipmentService");
			const oPallet = oPalletContext.getObject();
			const oModel = this.getView().getModel("ShipmentService");
			const aComponentPaths = oPalletContext.getObject("components") || [];
			const iCounter = aComponentPaths.reduce(function (iTotal, sComponentPath) {
				const oComponent = oModel.getObject("/" + sComponentPath);
				if (oComponent && oComponent.materialFamily === oGroup.key) {
					return iTotal + (Number(oComponent.quantity) || 0);
				}
				return iTotal;
			}, 0);

			//Atributos del elemento de cabecera de grupo
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key,
				type: (oPallet.palletStatus === 'pending' || oPallet.palletStatus === 'checked' || oPallet.palletStatus === 'inCheck' || oPallet.palletStatus === 'missing') && oPallet.palletType === 'M' ?
					sap.m.ListType.Navigation :
					sap.m.ListType.Inactive,
				counter: iCounter,
				tooltip: "Selecciona o Deselecciona todos los componentes de la familia " + oGroup.key,
				press: this.onGroupPress.bind(this)
			}).addStyleClass("my-group-header-class");

		},

		onGroupPress: function (oEvent) {

			//Seteamos flag para controlar el estado del boton
			if (oEvent.getSource().data("isChecked") === null || oEvent.getSource().data("isChecked") === false || oEvent.getSource().data("isChecked") === undefined) {
				oEvent.getSource().data("isChecked", true)
			} else if (oEvent.getSource().data("isChecked") === true) {
				oEvent.getSource().data("isChecked", false)
			}

			let sPressed = oEvent.getSource().data("isChecked");
			let materialFamily = oEvent.getSource().getTitle();
			let oItemsTable = this.byId("list.components").getItems();

			//Limpiamos Seleccionados
			this.SELECCIONADOS = this.SELECCIONADOS.filter(sel => sel.materialFamily !== materialFamily);

			for (let item of oItemsTable) {
				let aObject = item.getBindingContext("ShipmentService").getObject();
				if (aObject.materialFamily && aObject.materialFamily === materialFamily) {
					item.mAggregations.content[0].mAggregations.items[1].mAggregations.items[0].setPressed(sPressed);

					//Actualizamos Seleccionados solo si se necesita agregar
					if (sPressed && aObject.statusId === 'pending') {
						this.SELECCIONADOS.push(aObject);
					} else if (!sPressed && aObject.statusId === 'checked') {
						this.SELECCIONADOS.push(aObject);
					}
				}
			}

			//Actualizamos auxiliar Seleccionados
			this.SeleccionadosAux = this.SELECCIONADOS;
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_showShipmentDetail: function (oItem) {
			const oPallet = this.getView().getElementBinding("ShipmentService").getBoundContext().getObject();
			// set the layout property of FCL control to show two columns
			this.getRouter().navTo("shipmentDetail", {
				shipmentId: oPallet.shipmentId,
				salesOrganizationId: this.salesOrganizationId,
				shipmentDate: JSON.stringify(oPallet.shipmentDate).replaceAll("\"", "")
			});
		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: async function (oEvent) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("palletView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/palletBusy", true);
			var parameter = oEvent.getParameter("arguments");
			this.salesOrganizationId = parameter.salesOrganizationId;
			this.SALESORG = parameter.salesOrganizationId;
			this.PALLETID = parameter.palletId;
			this.FECHAVIAJE = parameter.shipmentDate;
			this.PACKSPORFAMILIA = [];
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			await this._getLocation()

			const oModel = this.getOwnerComponent().getModel("ShipmentService");
			await oModel.metadataLoaded();
			const sObjectPath = oModel.createKey("pallets", {
				shipmentId: parameter.shipmentId,
				plantId: parameter.plantId,
				shipmentDate: parameter.shipmentDate,
				shipmentType: parameter.shipmentType,
				palletId: parameter.palletId
			});
			this._bindView("/" + sObjectPath);

			try {
				this.agregarPCK();
			} catch (error) {

				this._showShipmentMaterialAux();

			}
			oViewModel.setProperty("/palletBusy", false);

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("palletView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/palletBusy", false);

			this.getView().bindElement({
				path: sObjectPath,
				model: "ShipmentService",
				parameters: {
					expand: "components"
				},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						//oViewModel.setProperty("/palletBusy", true);
					},
					dataReceived: function () {
						//oViewModel.setProperty("/palletBusy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oViewModel = this.getModel("palletView"),
				oElementBinding = oView.getElementBinding("ShipmentService");

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			const sPath = oElementBinding.getPath(),
				oData = oElementBinding.getBoundContext().getObject();

			ShipmentService.getPlanningShipment(oData, this.salesOrganizationId).then(function (oShipment) {
				oViewModel.setProperty("/yardStatus", oShipment.yardStatus);
			});
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
			oViewModel.setProperty("/palletStatus", oData.palletStatus);
			oElementBinding.getBoundContext().getObject("components").forEach(function (sComponentPath) {
				var oComponent = this.getOwnerComponent().getModel("ShipmentService").getObject("/" + sComponentPath);
				if (oComponent.statusId.length === 0) {
					this.getOwnerComponent().getModel("ShipmentService").setProperty("/" + sComponentPath + "/observedQuantity", oComponent.quantity);
				}
			}, this)
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("palletView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/palletBusy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		agregarPCK: function () {
			setTimeout(function () {


				/* 				var counters = window.document.querySelectorAll('.sapMGHLICounter')
								if (counters && counters.length > 0) {
									for (var index = 0; index < counters.length; index++) {
										var counter = counters[index];
										console.log("counter encontrado")
										if (!counter.innerHTML.includes("PCK")) {
											counter.innerHTML = (counter.innerHTML.slice(2, -1) + " PCK");
										}
									}
								} */
			}, 500);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},

		onMaterialesAuxiliaresButtonPress: async function (oEvent) {
			// 			var oButton = oEvent.getSource(),
			// 	oView = this.getView();

			// if (!this._pDialog) {
			// 	this._pDialog = Fragment.load({
			// 		id: oView.getId(),
			// 		name: "sap.m.sample.TableSelectDialog.Dialog",
			// 		controller: this
			// 	}).then(function(oDialog){
			// 		oView.addDependent(oDialog);
			// 		return oDialog;
			// 	});
			// }

			// this._pDialog.then(function(oDialog){
			// 	this._configDialog(oButton, oDialog);
			// 	oDialog.open();
			// }.bind(this));

			await this._auxiliaryMaterialsPallet();

			let oDataMaterialsAux = this.getOwnerComponent().getModel('shipmentAux');
			if (!oDataMaterialsAux) {
				await this._auxiliaryMaterials();
				oDataMaterialsAux = this.getOwnerComponent().getModel('shipmentAux');
			}

			//Asigna Pallet a modelo de materiales auxiliares
			let aHeaderProductAux = oDataMaterialsAux.getData().headerProductAux;
			for (let i = 0; i < aHeaderProductAux.length; i++) {
				aHeaderProductAux[i].palletId = this.PALLETID;
				aHeaderProductAux[i].shipmentDate = this.FECHAVIAJE;
			}

			//Abre el fragment de materiales auxiliares en pallet
			this.getFragment("MaterialAuxInPallet").then(function (oDialog) {
				oDialog.open();
			}.bind(this));

		},

		_auxiliaryMaterialsPallet: async function () {
			var oViewModel = this.getModel("detailView");
			let aFilter = []
			const oContext = this.getView().getBindingContext("ShipmentService").getObject()
			aFilter.push(new Filter('shipmentId', FilterOperator.EQ, oContext.shipmentId))
			aFilter.push(new Filter('salesOrganizationId', FilterOperator.EQ, this.SALESORG))
			aFilter.push(new Filter('shipmentDate', FilterOperator.EQ, oContext.shipmentDate))
			aFilter.push(new Filter('palletId', FilterOperator.EQ, this.PALLETID))

			let oFilter = new Filter({
				filters:
					aFilter,
				and: true
			})

			let oParameters = {
				filters: [oFilter]
			}

			let oRead = this.getOdataModel().read('/auxMaterialPallets', oParameters)
			await oRead.then(async function (response) {
				let aResults = []
				response.data ? aResults = response.data.results : aResults
				await this._setAuxTable(aResults)
			}.bind(this)).catch(async function (response) {
				let aResults = []
				await this._setAuxTable(aResults)
			}.bind(this)).finally(() => {
				this.getView().getModel().setProperty("/busy", false);
			})
		},
		_setAuxTable: async function (aData) {
			let aFilter = []
			let aMaterials = []
			let aMaterialAux

			aFilter.push(new Filter('auxiliaryMaterial', FilterOperator.EQ, true))
			const oParams = {
				filters: aFilter
			}

			const oMaterialAuxRead = this.getOdataModel('material').read('/materials', oParams)

			await oMaterialAuxRead.then((response) => {
				aMaterialAux = response.data.results
			})

			//materiales auxiliares predefinidos
			for (let entry of aMaterialAux) {
				aMaterials.push({
					materialId: entry.materialId,
					materialDescription: entry.materialDescription,
					baseUnit: entry.baseUM,
					quantity: null,
					local: true,
					unblocked: false
				})
			}

			//Linea vacia
			const oLocalAuxMat = [{ materialId: '', materialDescription: '', quantity: null, baseUnit: '', local: true, unblocked: true }]

			//desbloqueamos los materiales cargados del backend
			// var r = aData.map(x => {
			// 	x.unblocked = false;
			// 	x.local = false
			// 	return x
			// });

			let backendMaterial = aData.map(e => {
				return {
					baseUnit: e.baseUnit,
					materialDescription: e.materialDescription,
					materialId: e.materialId,
					quantity: e.quantity === '0' ? '' : e.quantity,
					unblocked: false,
					local: false
				}
			})


			//unimos todo con un set para que no se repitan datos			
			//  let oMaterial = {
			//  	headerProduct: aMaterials.concat(aData).concat(oLocalAuxMat)
			//  }			

			aMaterials = aMaterials.filter(e => {
				return !backendMaterial.find(ef => {
					return ef.materialId == e.materialId
				})
			})
			aMaterials = backendMaterial.concat(aMaterials).concat(oLocalAuxMat)

			//// let setMaterials = new Set(backendMaterial.concat(aMaterials))
			//// aMaterials = [...setMaterials].concat(oLocalAuxMat)

			let oMaterial = {
				headerProductAux: aMaterials
			}

			let oModel = new JSONModel();

			oModel.setData(oMaterial);
			this.setModel(oModel, 'shipment');

			//Modificacion Mejora 1 - Nativa Carlos Aparicio
			//Guardamos una copia de los materiales auxiliares para validacion posterior
			let oModelAux = new JSONModel();
			oModelAux.setData({ headerProductAux: JSON.parse(JSON.stringify(aMaterials)) });
			this.getOwnerComponent().setModel(oModelAux, 'shipmentAux');
		},

		onRowAdd: function (sNumber) {
			let oModel = this.getModel('shipmentAux')
			let aData = oModel.getProperty('/headerProductAux')
			aData.push({ materialId: '', materialDescription: '', quantity: null, baseUnit: '', deleted: false, local: true, unblocked: true })
			oModel.setProperty('/headerProductAux', aData)
			// oModel.refresh(true)
		},


		onRowDelete: function (oEvent) {
			let sProperty = '/headerProductAux'
			let oModel = this.getModel('shipmentAux')
			let aData = oModel.getProperty(sProperty)

			var path = oEvent.getParameter('listItem').getBindingContext('shipmentAux').getPath();
			var idx = parseInt(path.substring(path.lastIndexOf('/') + 1));
			const oPopped = aData.splice(idx, 1)


			// const oPopped = aData.pop()
			if (aData.length === 0) {
				aData.push({ materialId: '', materialDescription: '', quantity: null, baseUnit: '', deleted: false, local: true, unblocked: true })
			}


			// if (oPopped.length > 0) {
			// 	// if (oPopped[0].local !== true) {
			// 	let oShipmentModel = this.getModel()
			// 	let oContext = this.getView().getBindingContext("ShipmentService").getObject()
			// 	var sObjectPath = oShipmentModel.createKey("auxiliaryMaterials", {
			// 		shipmentId: oContext.shipmentId,
			// 		salesOrganizationId: oContext.salesOrganizationId,
			// 		shipmentDate: oContext.shipmentDate,					// shipmentDate: sDate,
			// 		materialId: oPopped[0].materialId
			// 	});

			// 	oShipmentModel.remove(`/${sObjectPath}`, { groupId: "changes" })
			// 	var detailViewModel = this.getModel('detailView');
			// 	this.getModel('detailView').setProperty('/busy', true);

			// 	let oSubmit = new Promise(function (resolve, reject) {
			// 		oShipmentModel.submitChanges({
			// 			success: function (oData, response) {
			// 				resolve(response)
			// 			}.bind(this),
			// 			error: function (oError, response) {
			// 				reject(oError)
			// 			}.bind(this)
			// 		})
			// 	});
			// 	var that = this;
			// 	oSubmit.then(function (response) {
			// 		detailViewModel.setProperty('/busy', false);
			// 	}, function (error) {
			// 		that.getModel('detailView').setProperty('/busy', false);
			// 	});

			// }
			oModel.setProperty('/headerProductAux', aData)
			// oModel.refresh(true)
		},

		onAuxMatPalletSave: async function (oEvent) {

			let aProducts = this.getModel('shipmentAux').getProperty('/headerProductAux')
			let oShipmentModel = this.getModel();
			let oContext = this.getView().getBindingContext("ShipmentService").getObject()
			let oDataMaterialsAux = this.getOwnerComponent().getModel('shipmentAux');
			this._auxMateriaPalletSave(aProducts, oContext, oShipmentModel);

		},
		_auxMateriaPalletSave: async function (aProducts, oContext, oShipmentModel) {
			aProducts.forEach(function (e, i, a) {
				if (e.materialId && e.quantity) {

					let oEntry = {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: this.SALESORG,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId,
						palletId: this.PALLETID,
						quantity: e.quantity,
						baseUnit: e.baseUnit
					}

					var sObjectPath = oShipmentModel.createKey("auxMaterialPallets", {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: this.SALESORG,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId,
						palletId: this.PALLETID
					});

					if (e.local === true) {
						oShipmentModel.create(`/auxMaterialPallets`, oEntry, { groupId: "changes" })
					} else {
						return new Promise((resolve, reject) => {
							oShipmentModel.update(`/${sObjectPath}`, oEntry, {
								groupId: "changes",
								success: () => resolve(),
								error: (oError) => reject(oError)
							});
						});
						//oShipmentModel.update(`/${sObjectPath}`, oEntry, { groupId: "changes" })
					}

				}
			}.bind(this))

			const bQuantity = aProducts.every(e => e.quantity === null || e.quantity === 0 || e.quantity === '0')
			this.callComplete = bQuantity

			//this.getModel('detailView').setProperty('/busy', true)

			let that = this;
			let oSubmit = await new Promise(function (resolve, reject) {
				oShipmentModel.submitChanges({
					success: function (oData, response) {
						sap.m.MessageToast.show("Materiales auxiliares guardados correctamente.");
						that.onAuxMatDialogClose();
						resolve(response)
					}.bind(this),
					error: function (oError, response) {
						sap.m.MessageToast.show("Error al guardar materiales auxiliares.");
						that.onAuxMatDialogClose();
						reject(oError)
					}.bind(this)
				});
			})
			//		let newSubmit = oSubmit;
			//			this.getModel('detailView').setProperty('/busy', false)

		},
		onAuxMatDialogClose: function () {
			this.getFragment("MaterialAuxInPallet").then(function (oDialog) {
				oDialog.close();
			}.bind(this));
		},

		validaViaje: async function (sId, sDate, sType, sSalesOrg) {

			let oView = this.getView();
			//let oContext = this.getView().getBindingContext("ShipmentService").getObject();
			let oModel = this.getView().getModel("ShipmentService");

			var sObjectPath = oModel.createKey("validaViajes", {
				shipmentId: sId,
				shipmentDate: sDate,
				shipmentType: sType,
				salesOrganizationId: sSalesOrg
			});

			try {
				// Envolver el read en una Promesa
				const oData = await new Promise((resolve, reject) => {
					oModel.read("/" + sObjectPath, {
						success: resolve,
						error: reject
					});
				});

				// Manejar los datos obtenidos
				console.log(oData);
				if (oData) {
					// if (this.getOwnerComponent().getModel('materialAuxModel')) { 
					// 	this.getOwnerComponent().setModel(new JSONModel({ editableMaterialAux: bEditableAux }), 'materialAuxModel'); 
					// }
				}

			} catch (oError) {
				// Manejar el error
				console.error("Error al leer datos:", oError);
			}

			// const validaViajes = oModel.read(`/${sObjectPath}`)

			// await validaViajes.then(async function (response) {
			// 	let aResults = []
			// 	//response.data ? aResults = response.data.results : aResults
			// 	//await this._setAuxTable(aResults)
			// }.bind(this)).catch(async function (response) {
			// 	//let aResults = []
			// 	//await this._setAuxTable(aResults)
			// }.bind(this)).finally(() => {
			// 	//this.getView().getModel().setProperty("/busy", false);
			// })

			// // await validaViajes.then((response) => {
			// // 	let oResults = response.data.results
			// // })

		},

		/* =========================================================================
		 * ADAPTACIÓN CRUD / DEEP ENTITY — NO reemplaza la lógica de arriba
		 * -------------------------------------------------------------------------
		 * Basado en el rediseño ABAP de ZCL_ZPLANNING_SHIPMENT_DPC_EXT (chat
		 * "Migrar logica de funcion a metodo CRUD con deep entity"). El backend
		 * ahora soporta, ADEMÁS de los function imports 'check'/'uncheck'/
		 * 'palletCheck'/'palletUncheck' (que se siguen usando arriba sin cambios):
		 *
		 *   1) PATCH estándar sobre la entidad "palletComponents": si el body
		 *      incluye la propiedad "status" ('checked'/'pending'), el backend lo
		 *      toma como un check/uncheck de ESE item y usa el mismo motor
		 *      CHECK_UNCHECK (ver PALLETCOMPONENTS_UPDATE_ENTITY, "Camino 1" en el
		 *      ABAP). Reemplazo CRUD 1 a 1 del function import 'check'/'uncheck'
		 *      para UN solo item -> _onPalletComponentSelectCRUD / onGuardarCRUD.
		 *
		 *   2) Deep Entity de check/uncheck: un único POST con la cabecera del
		 *      pallet + N items anidados (navegación) resuelto con UNA sola
		 *      llamada de backend, en vez de las N llamadas secuenciales que hace
		 *      hoy onGuardar/onGuardarDesdeFaltante (una por item seleccionado) o
		 *      de un 'palletCheck'/'palletUncheck' aparte -> onTooglePalletCRUD.
		 *
		 * CONFIRMADO contra METADATA_SHIPPMENT.xml ($metadata real del gateway):
		 * Entity Set = "checkUncheckSet" (no "checkUnchecks"), y OJO que las
		 * propiedades de checkUncheck / checkUncheckItem / checkUncheckMessage
		 * van en PascalCase (ShipmentId, PlantId, Checked, Success, etc.), a
		 * diferencia del resto del servicio (planningShipment, pallet,
		 * palletComponent) que usa camelCase. Solo los nombres de navegación
		 * (checkUncheckNav / checkUncheckMessageNav) quedaron en camelCase.
		 * ========================================================================= */

		_CHECK_UNCHECK_CONFIG: {
			entitySet: "checkUncheckSet",
			navProperty: "checkUncheckNav",
			messageNavProperty: "checkUncheckMessageNav"
		},

		/**
		 * Arma el payload deep-entity (cabecera + navegación de items) para el
		 * POST único de check/uncheck. Los campos de cabecera son los mismos que
		 * hoy se mandan por urlParameters en _onPalletComponentSelect / onTooglePallet,
		 * pero en PascalCase (así quedó modelada la entidad checkUncheck en el
		 * $metadata real: ShipmentId/PlantId/ShipmentDate/ShipmentType/PalletId/
		 * MarketingStorageLocation/PackagingStorageLocation/PalletType/YardStatus/
		 * SalesOrganizationId).
		 * aItems: [{ floor, materialId, checked }]  (checked = true -> check, false -> uncheck)
		 */
		_buildCheckUncheckDeepPayload: function (oPalletHeader, aItems) {
			var oViewModel = this.getModel("palletView");
			var oConfig = this._CHECK_UNCHECK_CONFIG;

			var oPayload = {
				ShipmentId: oPalletHeader.shipmentId,
				PlantId: oPalletHeader.plantId,
				ShipmentDate: oPalletHeader.shipmentDate,
				ShipmentType: oPalletHeader.shipmentType,
				PalletId: oPalletHeader.palletId,
				MarketingStorageLocation: this.sLocation,
				PackagingStorageLocation: this.sStore,
				PalletType: oPalletHeader.palletType,
				YardStatus: oViewModel ? oViewModel.getProperty("/yardStatus") : undefined,
				SalesOrganizationId: this.salesOrganizationId
			};

			// Campos del item (checkUncheckItem, también PascalCase). Floor/
			// MaterialId son la clave propia del item; el resto de la clave
			// (PlantId/ShipmentDate/ShipmentType/PalletId/ShipmentId) SE REPITE
			// acá explícitamente en cada item.
			// OJO: originalmente se asumía que el framework de deep-insert la
			// resolvía sola vía ReferentialConstraint a partir de la cabecera,
			// pero en la práctica el backend está recibiendo ShipmentDate en 0
			// (inicial) en los items -> se manda explícita para no depender de
			// ese comportamiento.
			oPayload[oConfig.navProperty] = (aItems || []).map(function (oItem) {
				return {
					PlantId: oPayload.PlantId,
					ShipmentDate: oPayload.ShipmentDate,
					ShipmentType: oPayload.ShipmentType,
					PalletId: oPayload.PalletId,
					ShipmentId: oPayload.ShipmentId,
					Floor: oItem.floor,
					MaterialId: oItem.materialId,
					Checked: !!oItem.checked
				};
			});

			return oPayload;
		},

		/**
		 * POST directo (sin group diferido) del deep-entity de check/uncheck.
		 * Mismo patrón de Promise que ya usa el resto del controller para create/
		 * update, con la diferencia de que acá el payload trae la colección de
		 * items anidada en vez de mandarse fila por fila.
		 */
		_createCheckUncheckDeepEntity: function (oPayload) {
			var oModel = this.getView().getModel("ShipmentService");
			var oConfig = this._CHECK_UNCHECK_CONFIG;

			return new Promise(function (resolve, reject) {
				oModel.create("/" + oConfig.entitySet, oPayload, {
					success: function (oData) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			});
		},

		/**
		 * Traduce los mensajes por item que vuelven en la navegación de mensajes
		 * del deep-entity al MessageDialog existente (mismo componente que ya usa
		 * el resto de la app), y devuelve un resumen para que el caller decida si
		 * hace falta refrescar/navegar igual que en el flujo actual.
		 */
		_processCheckUncheckDeepEntityResponse: function (oResponseData) {
			var oConfig = this._CHECK_UNCHECK_CONFIG;
			var aItemResults = (oResponseData && oResponseData[oConfig.navProperty] && oResponseData[oConfig.navProperty].results) || [];
			var aErrorMessages = [];

			aItemResults.forEach(function (oItemResult) {
				if (!oItemResult.Success) {
					var aItemMessages = (oItemResult[oConfig.messageNavProperty] && oItemResult[oConfig.messageNavProperty].results) || [];
					aItemMessages.forEach(function (oMsg) {
						aErrorMessages.push({
							code: (oMsg.Id || "") + "/" + (oMsg.Number || ""),
							message: oMsg.Message,
							severity: oMsg.Type === "E" || oMsg.Type === "A" ? "error" : "warning"
						});
					});
				}
			});

			if (aErrorMessages.length) {
				this.getMessageDialog().addMessagesFromArray(aErrorMessages);
			}

			return {
				hasError: aErrorMessages.length > 0,
				palletClosed: oResponseData ? oResponseData.PalletClosed : undefined,
				newShipmentStatus: oResponseData ? oResponseData.NewShipmentStatus : undefined,
				items: aItemResults
			};
		},

		/**
		 * Equivalente CRUD de _onPalletComponentSelect: en vez de un function
		 * import 'check'/'uncheck' por item, hace un PATCH estándar sobre
		 * palletComponents (Camino 1 de PALLETCOMPONENTS_UPDATE_ENTITY). Pensado
		 * para reemplazar, item por item, el mismo rol que hoy cumple
		 * _onPalletComponentSelect si se decide wirear la UI a este flujo.
		 */
		_onPalletComponentSelectCRUD: function (oComponent) {
			var oModel = this.getView().getModel("ShipmentService");
			var sNewStatus = (oComponent.statusId === 'pending' || oComponent.statusId === '') ? 'checked' : 'pending';

			var sObjectPath = oModel.createKey("palletComponents", {
				shipmentId: oComponent.shipmentId,
				plantId: oComponent.plantId,
				shipmentDate: oComponent.shipmentDate,
				shipmentType: oComponent.shipmentType,
				palletId: oComponent.palletId,
				floor: oComponent.floor,
				materialId: oComponent.materialId
			});

			return new Promise(function (resolve, reject) {
				// OJO: METADATA_SHIPPMENT.xml expone esta propiedad como "statusId"
				// en la entidad palletComponent (línea <Property Name="statusId" ...
				// sap:label="Status"/>), aunque el ABAP de PALLETCOMPONENTS_UPDATE_ENTITY
				// lee "er_entity-status" (nombre de campo interno de la estructura
				// TS_PALLETCOMPONENT generada). Se usa acá el nombre del $metadata real
				// (statusId); si el PATCH devuelve 400 con "Unknown property", confirmar
				// contra la estructura MPC generada si SEGW la renombró a "status".
				oModel.update("/" + sObjectPath, {
					statusId: sNewStatus
				}, {
					success: function (oData) {
						resolve(oData);
					},
					error: function (oError) {
						this.getMessageDialog().addResponse(oError);
						reject(oError);
					}.bind(this)
				});
			}.bind(this)).then(function () {
				return ShipmentService.read(this.getView().getBindingContext("ShipmentService").getPath()).then(function () {
					this.byId("list.components").getBinding("items").refresh();
				}.bind(this));
			}.bind(this));
		},

		/**
		 * Equivalente CRUD de onGuardar/onGuardarDesdeFaltante: en vez de recorrer
		 * this.SELECCIONADOS llamando _onPalletComponentSelect (1 function import
		 * por item, N round-trips), arma UN único payload deep-entity con todos
		 * los items seleccionados y hace UN solo POST.
		 */
		onGuardarCRUD: async function (oEvent) {
			if (!this.SELECCIONADOS || !this.SELECCIONADOS.length) {
				return;
			}

			var oViewModel = this.getModel("palletView");
			var oView = this.getView();

			// EVITAR ERROR ENTRE SELECCION DE COMPONENTES Y PALLET (mismo guard que
			// usa onGuardar): si el usuario navegó a otro pallet entre que seleccionó
			// items y que apretó Guardar, this.SELECCIONADOS puede traer arrastrados
			// items de un pallet que ya no es el que está en pantalla. Se descartan
			// ANTES de armar el payload, no después: un deep-entity mezclando items
			// de dos pallets distintos no es válido (la cabecera es de UN pallet).
			var sPalletId = this.byId("list.components").getBindingContext('ShipmentService').getObject().palletId;
			this.SELECCIONADOS = this.SELECCIONADOS.filter(function (sel) { return sel.palletId === sPalletId; });
			this.SeleccionadosAux = this.SELECCIONADOS;

			if (!this.SELECCIONADOS.length) {
				return;
			}

			oViewModel.setProperty("/palletBusy", true);
			oView.setBusy(true);

			var oPalletHeader = oView.getBindingContext("ShipmentService").getObject();

			// Mismo criterio de orden que onGuardar (uncheck antes que check), para
			// mantener el comportamiento visual/de negocio observado hoy aunque acá
			// viajen todos en UNA sola llamada y el orden no afecte al backend.
			var aSeleccionadosOrdenados = this.SELECCIONADOS.slice().sort(function (a, b) {
				if (a.statusId !== "checked" && b.statusId === "checked") { return -1; }
				if (a.statusId === "checked" && b.statusId !== "checked") { return 1; }
				return 0;
			});

			var aItems = aSeleccionadosOrdenados.map(function (oComponent) {
				return {
					floor: oComponent.floor,
					materialId: oComponent.materialId,
					checked: (oComponent.statusId === 'pending' || oComponent.statusId === '')
				};
			});

			var oPayload = this._buildCheckUncheckDeepPayload(oPalletHeader, aItems);

			try {
				var oResponseData = await this._createCheckUncheckDeepEntity(oPayload);
				var oResult = this._processCheckUncheckDeepEntityResponse(oResponseData);

				this.byId("list.components").getBinding("items").refresh();

				if (!oResult.hasError) {
					this.NOIRATRAS = false;
					this._showShipmentDetail();
				}
			} catch (oError) {
				this.getMessageDialog().addResponse(oError);
			} finally {
				this.SELECCIONADOS = [];
				this.SeleccionadosAux = [];
				oView.setBusy(false);
				oViewModel.setProperty("/palletBusy", false);
			}
		},

		/**
		 * Equivalente CRUD de onTooglePallet('palletCheck'/'palletUncheck'):
		 * en vez del function import a nivel pallet, arma el deep-entity con
		 * TODOS los items del pallet actualmente cargados en "list.components" y
		 * hace UN solo POST marcando "checked" según la acción pedida.
		 */
		onTooglePalletCRUD: async function (oEvent, bChecked) {
			var oButton = oEvent.getSource();
			oButton.setBusy(true);

			var oPalletHeader = this.getView().getBindingContext("ShipmentService").getObject();

			var aItems = this.byId("list.components").getItems().map(function (oItem) {
				var oComponent = oItem.getBindingContext("ShipmentService").getObject();
				return {
					floor: oComponent.floor,
					materialId: oComponent.materialId,
					checked: bChecked
				};
			}).filter(function (oItem) {
				return !!oItem.materialId;
			});

			var oPayload = this._buildCheckUncheckDeepPayload(oPalletHeader, aItems);

			try {
				var oResponseData = await this._createCheckUncheckDeepEntity(oPayload);
				this._processCheckUncheckDeepEntityResponse(oResponseData);
				this.byId("list.components").getBinding("items").refresh();
			} catch (oError) {
				this.getMessageDialog().addResponse(oError);
			} finally {
				oButton.setBusy(false);
			}
		},

		onPalletCheckCRUD: function (oEvent) {
			this.onTooglePalletCRUD(oEvent, true);
		},

		onPalletUncheckCRUD: function (oEvent) {
			this.onTooglePalletCRUD(oEvent, false);
		},

		// ===== ADAPTACION CRUD/DEEP ENTITY: dispatchers del switch global =====
		// Estos son los handlers que quedaron enganchados en la vista (bloque
		// "handlers NUEVOS" de PalletDetail.view.xml). Cada uno decide, en base al
		// switch global (testMode>/useCRUD, seteado desde ShipmentDetail.view.xml y
		// leído acá vía BaseController._isCRUDModeOn()), si ejecuta la lógica CRUD
		// nueva (checkUncheckSet deep entity) o la lógica original (Function Import),
		// sin duplicar código: delega al método ya existente en cada caso.
		onGuardarSwitch: function (oEvent) {
			if (this._isCRUDModeOn()) {
				return this.onGuardarCRUD(oEvent);
			}
			return this.onGuardar(oEvent);
		},

		onPalletCheckSwitch: function (oEvent) {
			if (this._isCRUDModeOn()) {
				return this.onPalletCheckCRUD(oEvent);
			}
			return this.onPalletCheck(oEvent);
		},

		onPalletUncheckSwitch: function (oEvent) {
			// if (this._isCRUDModeOn()) {
			// 	return this.onPalletUncheckCRUD(oEvent);
			// }
			return this.onPalletUncheck(oEvent);
		}

	});

});
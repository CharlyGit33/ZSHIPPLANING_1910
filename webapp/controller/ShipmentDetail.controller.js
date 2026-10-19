sap.ui.define([
	"./BaseController",
	"../library/kioskboard-aio-2.3.0.min",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/ndc/BarcodeScanner",
	"../model/formatter",
	"../services/ShipmentService",
	"../model/BarcodeScanner",
	'sap/m/MessageToast',
	"sap/m/MessageBox",
	"sap/ui/core/Element",
	"sap/ui/Device"
], function (BaseController, kioskBoard, JSONModel, Filter, FilterOperator, Sorter, BarcodeScanner,
	formatter, ShipmentService, Scanner, MessageToast, MessageBox, Element, Device) {
	"use strict";

	return BaseController.extend("ar.com.relesa.shipment.planning.controller.ShipmentDetail", {

		formatter: formatter,
		sScannedText: "",
		eventSubscribed: false,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			//BaseController.prototype.onInit.apply(this, arguments);
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				editable: false,
				visible: false,
				enabled: false,
				readKey: false,
				consumoePressed: false,
				scanPressed: true,
				precargaEnabled: false,
				Marca: '',
				Sabor: '',
				Tamano: '',
				Venta: '',
			});

			var oTrfModel = new JSONModel({
				lastTime: new Date().getTime(),
				nextTime: new Date().getTime(),
				timeTextString: ""
			});


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

			this.getView().setModel(oTrfModel, "varTrfGlobales");
			//FOCUS OUT
			//this.getView().byId("materialTable").attachBrowserEvent("keydown", jQuery.proxy(this.handleFocus, this, 'headerProduct'))
			this.getRouter().getRoute("shipmentDetail").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			this.getOwnerComponent().getModel("ShipmentService").metadataLoaded().then(this._onMetadataLoaded.bind(this));

			var PALLETSMIXTOS;
			var VIAJEID;
			var VIAJEFECHA;

			window.onunload = function () { window.scrollTo(0, 0); }

			this.OSHIPMENTSELECCIONADO = [];
			this.OPALLETSELECCIONADO = [];


		},

		onAfterRendering: function () {
			// document.addEventListener("keydown", function onPress(event) {				
			// 	this.procKeys(event);
			// }.bind(this));
			document.addEventListener("keydown", jQuery.proxy(this._procKeys, this))

			var that = this;

			//COMENTO EL CLADO
			/* 			setInterval(function(){ 
							if(Device.support.touch){
								that.setInputFields();
								that._initKeyboard()
							}  
						}, 500);	 */

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

		_initKeyboard: async function () {
			if (Device.support.touch && !Device.system.desktop) {
				const sPath = sap.ui.require.toUrl("ar/com/relesa/shipment/planning/library/keyboard.json")
				KioskBoard.init({
					keysArrayOfObjects: null,
					keysSpecialCharsArrayOfStrings: null,
					keysNumpadArrayOfNumbers: null,
					language: 'en',
					theme: 'light',
					autoScroll: true,
					capsLockActive: true,
					allowRealKeyboard: false,
					allowMobileKeyboard: false,
					cssAnimations: true,
					cssAnimationsDuration: 360,
					cssAnimationsStyle: 'slide',
					keysAllowSpacebar: true,
					keysSpacebarText: 'Space',
					keysFontFamily: 'sans-serif',
					keysFontSize: '22x',
					keysFontWeight: 'normal',
					keysIconSize: '24px',
					keysEnterText: 'Enter',
					keysEnterCallback: undefined,
					keysEnterCanClose: true,
					keysJsonUrl: sPath,
				});
				KioskBoard.run('.kioskboard')
			}

		},

		onSetConsumo: async function (oEvent) {
			const oSource = oEvent.getSource();
			const bPressed = oEvent.getParameter('pressed');

			try {
				const oHeader = this.getView().getElementBinding('ShipmentService').getBoundContext().getObject();

				// Parámetros para la función OData
				const oParam = {
					method: 'POST',
					urlParameters: {
						Fecha: oHeader.shipmentDate,
						Viaje: oHeader.shipmentId,
						Locacion: oHeader.salesOrganizationId,
						Check: bPressed
					}
				};

				// Llamada a la función OData usando await
				await this.getOdataModel('ShipmentService').callFunction('/ConsumoCamionero', oParam);

				// Actualiza la propiedad consumoPressed en el modelo detailView
				this.getModel('detailView').setProperty('/consumoPressed', true);

				// Solo cambia el tipo de botón si todo funcionó bien
				oSource.setType(bPressed ? "Accept" : "Reject");

			} catch (error) {
				console.error("Error al ejecutar la función ConsumoCamionero:", error);

				// Mostrar mensaje de error al usuario
				sap.m.MessageBox.error("Stock insuficiente para generar Consumo Camionero");


				// Opcional: Manejo de errores específicos de respuesta
				if (error.response) {
					const errorMessage = error.response.message || "Error desconocido.";
					console.error("Mensaje de error del servicio:", errorMessage);
				}

				// Actualiza los bindings y navega hacia atrás después de un breve retraso
				await this._updateAllBind();
				/*setTimeout(() => {
					this.getRouter().navTo("master", {}, true);
				}, 1000);*/ // Espera 1 segundo antes de navegar
			}
		},


		onTabSelect: function (oEvent) {
			const sKey = oEvent.getParameter('selectedKey')
			const oModel = this.getModel('detailView')
			if (sKey == 'matAux') {
				oModel.setProperty('/readKey', false)
			} else {
				oModel.setProperty('/readKey', true)
			}
		},

		// _procKeys: function (e, a) {
		// 	const readKeyEnabled = this.getModel('detailView').getProperty('/readKey');

		// 	if (readKeyEnabled) {
		// 		var prechar = '';
		// 		var poschar = 13; // Enter
		// 		var removechars = '|9|13|27|32|'; // ahora también descarta espacios (32)
		// 		var timeLimit = 500; // reducimos el límite de tiempo para evitar concatenaciones
		// 		var lastTime = this.getView().getModel('varTrfGlobales').getProperty('/lastTime');
		// 		var nextTime = new Date().getTime();
		// 		var timeTextString = this.getView().getModel('varTrfGlobales').getProperty('/timeTextString') || '';
		// 		var permitirAccion = true;

		// 		if (typeof (e.keyCode) !== 'undefined') {
		// 			if (e.keyCode !== 17 && e.key !== 'Unidentified') {
		// 				// Si el tiempo entre teclas es muy grande, reiniciamos el buffer
		// 				if (nextTime - lastTime <= timeLimit) {
		// 					if (removechars.indexOf("|" + e.keyCode + "|") == -1 && e.key.length == 1) {
		// 						timeTextString += e.key;
		// 						this.getView().getModel('varTrfGlobales').setProperty('/timeTextString', timeTextString);
		// 					}

		// 					// Si llega Enter, procesamos el código completo
		// 					if (poschar == e.keyCode && timeTextString !== '') {
		// 						try {
		// 							this.onGuardar();
		// 						} catch (error) { }

		// 						console.log("Reconocido Codigo: " + timeTextString);

		// 						var arr = [];
		// 						arr.push(timeTextString.trim());
		// 						this._assignLabelNumber(timeTextString, e);

		// 						// 🔑 Reiniciamos buffer para evitar concatenación
		// 						timeTextString = "";
		// 						this.getView().getModel('varTrfGlobales').setProperty('/timeTextString', timeTextString);
		// 						lastTime = 0;
		// 					}
		// 				} else {
		// 					// Si pasó demasiado tiempo, reiniciamos el buffer
		// 					if (removechars.indexOf('|' + e.keyCode + '|') == -1 && e.key.length == 1) {
		// 						timeTextString = e.key;
		// 					} else {
		// 						timeTextString = '';
		// 					}
		// 					this.getView().getModel('varTrfGlobales').setProperty('/timeTextString', timeTextString);
		// 				}
		// 			}
		// 		}

		// 		lastTime = nextTime;
		// 		this.getView().getModel('varTrfGlobales').setProperty('/lastTime', lastTime);
		// 		return permitirAccion;
		// 	}
		// },

		_procKeys: function (e, a) {
			const readKeyEnabled = this.getModel('detailView').getProperty('/readKey');

			if (readKeyEnabled) {
				var poschar = 13; // Código Enter
				var removechars = '|9|13|27|'; // Teclas de control a ignorar

				// Reducimos el límite: Zebra es extremadamente rápido.
				var timeLimit = 100;

				var oTrfModel = this.getView().getModel('varTrfGlobales');
				var lastTime = oTrfModel.getProperty('/lastTime');
				var nextTime = new Date().getTime();
				var permitirAccion = true;

				if (typeof (e.keyCode) !== 'undefined') {
					// Ignorar teclas modificadoras como Ctrl (17)
					if (e.keyCode !== 17 && e.key !== 'Unidentified') {
						var timeTextString = oTrfModel.getProperty('/timeTextString') || '';

						// Si pasó mucho tiempo, es un escaneo nuevo: reseteamos buffer.
						if (nextTime - lastTime > timeLimit) {
							timeTextString = '';
						}

						// Si no es una tecla de control, acumulamos
						if (removechars.indexOf("|" + e.keyCode + "|") == -1 && e.key.length == 1) {
							if (e.key !== " ") { // Opcional: ignorar espacios si tus etiquetas no los llevan
								timeTextString += e.key;
							}
							oTrfModel.setProperty('/timeTextString', timeTextString);
						}

						// Detectamos el Enter (Fin de escaneo)
						if (poschar == e.keyCode && timeTextString !== '') {

							e.preventDefault(); // <--- CRÍTICO: Evita que el Enter o Tab disparen acciones de la UI
							e.stopPropagation();

							// --- PASO CRÍTICO: LIMPIEZA ATÓMICA ---
							var sCodeToProcess = timeTextString.trim();

							// Limpiamos el modelo YA para que la siguiente tecla entre a un buffer vacío
							oTrfModel.setProperty('/timeTextString', "");
							oTrfModel.setProperty('/lastTime', 0);

							console.log("Procesando código: " + sCodeToProcess);

							try {
								// Ejecutamos la lógica de negocio con la variable local
								this.onGuardar();
								this._assignLabelNumber(sCodeToProcess, e);
							} catch (error) {
								console.error("Error en proceso: ", error);
							}

							permitirAccion = false; // Evitamos que el Enter haga otras cosas en la UI
						}
					}
				}

				// Actualizamos el tiempo para el cálculo de velocidad de la siguiente tecla
				oTrfModel.setProperty('/lastTime', nextTime);
				return permitirAccion;
			}
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onPalletPress: function (oEvent) {
			var oGridList = oEvent.getSource();
			this._showDetail(oEvent.getParameter("listItem") || oGridList);
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



		onMaterialFocusOut: function (oEvent) {
			const sValue = oEvent.getSource().getValue();
			const sKey = oEvent.getSource().getSelectedKey();
			var sNumber = Number(sValue);
			var bIsNaN = isNaN(sNumber);

			if (sValue) {
				if (bIsNaN === false) {
					var sPath = this.getModel('material').createKey('materials', {
						materialId: sValue
						// auxiliaryMaterial: true
					})
				} else {
					sPath = this.getModel('material').createKey('materials', {
						materialId: sKey
					})
				}

				this.oContext = oEvent.getSource().getBindingContext('shipment')
				let oMaterial = this.getOdataModel('material').read(`/${sPath}`)
				// this.sParam = oEvent.getSource().getName()
				// this.oSource = oEvent.getSource()
				oMaterial.then(function (response) {
					const oFirstItem = response.data
					const sPath = this.oContext.sPath
					const oItem = this.oContext.getObject()
					if (oItem) {
						oItem.materialId = oFirstItem.materialId
						oItem.materialDescription = oFirstItem.materialDescription
						oItem.baseUnit = oFirstItem.baseUM
						oItem.unblocked = false
						this.getModel('shipment').setProperty(sPath, oItem)
					}

					// const sId = this.sParam + 'Id'
					// this.getModel('inload').setProperty(`/head/${sId}`, response.data.driverId)
					// this.getModel('inload').setProperty(`/head/${this.sParam}`, response.data.driverName)

				}.bind(this))
			}
		},

		onSubmit: function (oEvent) {
			let oSource = oEvent.getSource()
			let aCells = oSource.getParent().getCells()
			let sCellsLength = aCells.length
			let sItemsLength = oSource.getParent().getList().getItems().length

			let oLastItem = aCells[sCellsLength - 1]
			let sLastItemId = oLastItem.getId()
			let sLastInput = sLastItemId.split('-').shift()
			let sCurrentId = oSource.getId()
			let sCurrentInput = sCurrentId.split('-').shift()
			let nColumnIndex = Number(sCurrentInput.split('input')[1])
			let nNextIndex = nColumnIndex + 1
			let sNextInput = `__input${nNextIndex}`

			let sPath = oSource.getBindingContext('shipment').getPath()
			let sPathLength = sPath.length
			sPath = Number(sPath.substr(sPathLength - 1, sPathLength))



			let nextItem = sCurrentId.split('-').slice(1, sCurrentId.length).unshift(sNextInput)

			let aNextItem = sCurrentId.split('-').slice(1, sCurrentId.length)
			aNextItem.unshift(sNextInput)
			aNextItem = aNextItem.join('-')
			let oItem = aCells.find(function (e) { return e.getId() == aNextItem })

			if (oSource.getId() != sLastItemId) {

				// 12/03				oItem.focus()

			} else if (sPath != sItemsLength - 1) {
				// 12/03				oSource.getParent().getList().getItems()[sPath + 1].getCells()[0].focus()
			} else {
				this.onRowAdd()
			}
		},

		onUpdate: function (oEvent) {
			let sItems = oEvent.getParameter('actual')
			let aItems = oEvent.oSource.getItems()
			let sLength = aItems.length
			let oInloadModel = this.getModel('inload')
			// if (sItems !== 1) {
			// 	oEvent.oSource.getItems()[aItems.length - 1].getCells()[0].focus()
			// }
		},

		handleFocus: function (sType, oEvent) {
			let sKey = oEvent.which
			let oModel = this.getView().getModel('shipment')
			let oTableModel = oModel.getProperty(`/${sType}`)
			let sLengthTable = oTableModel.length
			let sTableId = oEvent.target.id
			let aComponents = sTableId.split('-inner').shift().split('-')
			let sLengthList = parseInt(sTableId.split('-inner')[0].split('-')[aComponents.length - 1]) + 1
			let currentIndex = Number(aComponents.pop())
			let sInput = sTableId.split('-').shift()


			if (sType == 'headerProduct') {
				let aCells = this.byId('materialTable').getItems().shift().getCells()
				let sCellsLength = aCells.length

				let oLastItem = aCells[sCellsLength - 1]
				let sLastItemId = oLastItem.getId()
				let sLastInput = sLastItemId.split('-').shift()
				if (sInput == sLastInput && sLengthList == sLengthTable && (sKey == 9 && !event.shiftKey && !event.shiftKey)) {
					this.onRowAdd()
				}
			}

		},

		onRowAdd: function (sNumber) {
			let oModel = this.getModel('shipment')
			let aData = oModel.getProperty('/headerProduct')
			aData.push({ materialId: '', materialDescription: '', quantity: null, baseUnit: '', deleted: false, local: true, unblocked: true })
			oModel.setProperty('/headerProduct', aData)
			// oModel.refresh(true)
		},


		onRowDelete: function (oEvent) {
			let sProperty = '/headerProduct'
			let oModel = this.getModel('shipment')
			let aData = oModel.getProperty(sProperty)
			let oEntry = {
				baseUnit: "",
				deleted: false,
				materialDescription: "",
				materialId: "",
				quantity: null,
				unblocked: true
			}
			var path = oEvent.getParameter('listItem').getBindingContext('shipment').getPath();
			var idx = parseInt(path.substring(path.lastIndexOf('/') + 1));
			const oPopped = aData.splice(idx, 1)


			// const oPopped = aData.pop()
			if (aData.length === 0) {
				aData.push({ materialId: '', materialDescription: '', quantity: null, baseUnit: '', deleted: false, local: true, unblocked: true })
			}


			if (oPopped.length > 0) {
				// if (oPopped[0].local !== true) {
				let oShipmentModel = this.getModel()
				let oContext = this.getView().getBindingContext("ShipmentService").getObject()
				var sObjectPath = oShipmentModel.createKey("auxiliaryMaterials", {
					shipmentId: oContext.shipmentId,
					salesOrganizationId: oContext.salesOrganizationId,
					shipmentDate: oContext.shipmentDate,					// shipmentDate: sDate,
					materialId: oPopped[0].materialId
				});

				oShipmentModel.remove(`/${sObjectPath}`, { groupId: "changes" })
				var detailViewModel = this.getModel('detailView');
				this.getModel('detailView').setProperty('/busy', true);

				let oSubmit = new Promise(function (resolve, reject) {
					oShipmentModel.submitChanges({
						success: function (oData, response) {
							resolve(response)
						}.bind(this),
						error: function (oError, response) {
							reject(oError)
						}.bind(this)
					})
				});
				var that = this;
				oSubmit.then(function (response) {
					detailViewModel.setProperty('/busy', false);
				}, function (error) {
					that.getModel('detailView').setProperty('/busy', false);
				});

			}
			oModel.setProperty('/headerProduct', aData)
			// oModel.refresh(true)
		},
		_cancelarViajeTomado: function () {
			//local
			//sap.ui.getCore().byId("container-project1---master").getController().onFilterConfirm()
			//document.getElementById("application-PlanningShipment-display-component---shipmentDetail--dynamicPage-contentWrapper").scrollTop = localStorage['alturaScroll'];
			//deployado
			sap.ui.getCore().byId("application-PlanningShipment-display-component---master").getController().onFilterConfirm()
		},



		onShipmentComplete: async function (oEvent) {
			let aProducts = this.getModel('shipment').getProperty('/headerProduct')
			let oShipmentModel = this.getModel()
			let oContext = this.getView().getBindingContext("ShipmentService").getObject()

			this.callComplete = false


			const isNotNullQuantity = (element) => element.quantity === '0' || !element.quantity

			const bNull = aProducts.every(isNotNullQuantity)

			////////////////////REPLICO ONGUARDAR

			var that = this;
			var oView = that.getView();
			///DESDE ACA

			if (this.OSHIPMENTSELECCIONADO.length != 0) {

				try {
					var oViewModel = this.getModel("detailView");
					oViewModel.setProperty("/busy", true);
				} catch (error) {

				}


				for (let index = 0; index < this.OSHIPMENTSELECCIONADO.length; index++) {

					await that.checkUncheckPallet(that.OSHIPMENTSELECCIONADO[index], that.OPALLETSELECCIONADO[index])


					if (index == (this.OSHIPMENTSELECCIONADO.length - 1)) {
						setTimeout(() => {
							that.OSHIPMENTSELECCIONADO = [];
							that.OPALLETSELECCIONADO = [];
							if (bNull && oContext.yardStatus === 'invoiced') {
								MessageBox.warning('No se Incluyó material auxiliar en el viaje. ¿Desea continuar?', {
									actions: [MessageBox.Action.YES, MessageBox.Action.NO],
									onClose: async (sAction) => {
										if (sAction !== 'NO') {
											this._confirmShipment(oEvent, aProducts, oShipmentModel, oContext)
										}
									}
								})
							} else {
								console.log("desde el else linea 590")
								console.log(oEvent, aProducts, oShipmentModel, oContext)
								this._confirmShipment(oEvent, aProducts, oShipmentModel, oContext)
							}
							setTimeout(() => {
								that._cancelarViajeTomado();
							}, 2000);

						}, 4000);
					}

				}



			} else {
				if (bNull && oContext.yardStatus === 'invoiced') {
					MessageBox.warning('No se Incluyó material auxiliar en el viaje. ¿Desea continuar?', {
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: async (sAction) => {
							if (sAction !== 'NO') {
								this._confirmShipment(oEvent, aProducts, oShipmentModel, oContext)
								setTimeout(() => {
									that._cancelarViajeTomado();
								}, 2000);
							}
						}
					})
				} else {
					this._confirmShipment(oEvent, aProducts, oShipmentModel, oContext)
					setTimeout(() => {
						that._cancelarViajeTomado();
					}, 2000);
				}

			}




			////////////////////////////////////////
			/*
			if ( bNull && oContext.yardStatus === 'invoiced' ) {
				MessageBox.warning('No se Incluyó material auxiliar en el viaje. ¿Desea continuar?', {
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: async (sAction) => {
						if ( sAction !== 'NO' ) {
							this._confirmShipment(oEvent,aProducts,oShipmentModel,oContext)
						}
					}
				})
			} else {
				this._confirmShipment(oEvent,aProducts,oShipmentModel,oContext)
			} 
		 */

		},


		_confirmShipment: async function (oEvent, aProducts, oShipmentModel, oContext) {
			var that = this;
			aProducts.forEach(function (e, i, a) {
				if (e.materialId && e.quantity) {

					let oEntry = {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: oContext.salesOrganizationId,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId,
						quantity: e.quantity,
						baseUnit: e.baseUnit
					}

					var sObjectPath = oShipmentModel.createKey("auxiliaryMaterials", {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: oContext.salesOrganizationId,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId
					});

					if (e.local === true) {
						oShipmentModel.create(`/auxiliaryMaterials`, oEntry, { groupId: "changes" })
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

			this.getModel('detailView').setProperty('/busy', true)

			let oSubmit = new Promise(function (resolve, reject) {
				oShipmentModel.submitChanges({
					success: function (oData, response) {
						resolve(response)
					}.bind(this),
					error: function (oError, response) {
						reject(oError)
					}.bind(this)
				});
			})
			if (this.callComplete) {
				this._callShipmentAction(oEvent, "shipmentComplete").then(async function () {

					this.onCloseDetailPress();
				}.bind(this)).finally(async () => {
					await this._updateAllBind()
					this.getModel('detailView').setProperty('/busy', false)
					setTimeout(() => {
						that._cancelarViajeTomado();
					}, 2000);
				})
			} else {
				await oSubmit.then(function (oData) {
					this.getModel('detailView').setProperty('/busy', false)
					let oErrorResponse = oData.data.__batchResponses.filter(function (oBatchResponse) {
						return oBatchResponse.response && !oBatchResponse.response.statusCode.startsWith("2");
					})

					if (oErrorResponse.length) {
						this.getMessageDialog().addBatchResponseError(oData.data)
						setTimeout(() => {
							that._cancelarViajeTomado();
						}, 2000);
					} else {
						this._callShipmentAction(oEvent, "shipmentComplete").then(async function () {

							this.onCloseDetailPress();
							setTimeout(() => {
								that._cancelarViajeTomado();
							}, 2000);
						}.bind(this));
					}

				}.bind(this)).finally(async () => {
					await this._updateAllBind()
					this.getModel('detailView').setProperty('/busy', false)
				})
			}
		},


		_updateAllBind: async function () {
			var that = this;
			await this._updateBindingShipment()
			const oShipment = this.getView().getBindingContext("ShipmentService").getObject();
			await this._bindPallets(oShipment);
			this.getModel('ShipmentService').refresh(true)
			this.getModel('shipment').refresh(true)
			this.getModel('detailView').refresh(true)
			setTimeout(() => {
				that._cancelarViajeTomado();
			}, 1000);
		},

		onShipmentCompleteUndo: async function (oEvent) {
			var that = this;
			await this._callShipmentAction(oEvent, "shipmentCompleteUndo");
			await this._updateBindingShipment()
			setTimeout(() => {
				that._cancelarViajeTomado();
			}, 1000);
		},

		onSuggest: function (oEvent) {
			let oSource = oEvent.getSource(),
				sQuery = oEvent.getParameter('suggestValue'),
				oBinding = oSource.getBinding('suggestionItems'),
				sNumber = Number(sQuery),
				bIsNaN = isNaN(sNumber)
			let aFilter = []

			if (sQuery) {
				let oDescFilter = new Filter("materialDescription", FilterOperator.Contains, sQuery)
				let oIdFilter = new Filter("materialId", FilterOperator.Contains, sQuery)

				let matAuxFilter = new Filter('auxiliaryMaterial', FilterOperator.EQ, true)
				!bIsNaN ? aFilter.push(oIdFilter) : aFilter.push(oDescFilter)
				aFilter.push(matAuxFilter)
				oBinding.filter(aFilter)
				// oEvent.getSource().setFilterSuggests(false);
			}
		},

		onSuggestionItemSelected: function (oEvent) {
			let oSelectedItem = oEvent.getParameter('selectedItem')
			// if (oSelectedItem) {
			// 	let oItem = oSelectedItem.getBindingContext('material').getObject()
			// 	let sPath = oEvent.getSource().getBindingContext('shipment').getPath()
			// 	let oModel = this.getModel('shipment')
			// 	oModel.setProperty(`${sPath}/materialId`, oItem.materialId)
			// 	oModel.setProperty(`${sPath}/baseUnit`, oItem.baseUM)
			// 	oModel.setProperty(`${sPath}/materialDescription`, oItem.materialDescription)
			// 	// oModel.refresh(true)
			// }
		},

		onInputProductClean: function (oEvent) {
			let sValue = oEvent.getParameter('value')
			let oShipmentModel = this.getModel('shipment')
			let sPath = oEvent.getSource().getBindingContext('shipment').sPath
			oEvent.getSource().setValue(sValue)
			if (sValue == '') {
				oShipmentModel.setProperty(`${sPath}/materialId`, '')
				oShipmentModel.setProperty(`${sPath}/materialDescription`, '')
				oShipmentModel.setProperty(`${sPath}/baseUnit`, '')
				oShipmentModel.setProperty(`${sPath}/quantity`, null)
				oShipmentModel.setProperty(`${sPath}/local`, true)
			}
		},

		onDeleteTagPress: function (oEvent) {
			const oView = this.getView()
			const oTag = oEvent.getSource(),
				oListItem = oTag.getParent(),
				oPallet = oTag.getBindingContext("ShipmentService").getObject();
			oListItem.setBusy(true);
			const oShipment = oView.getBindingContext("ShipmentService").getObject();
			const organizationId = oShipment.salesOrganizationId
			const oDate = this.formatter.formatDate(oShipment.shipmentDate)
			const shipmentId = oShipment.shipmentId
			const shipmentType = oShipment.shipmentType
			const palletId = oPallet.palletId
			ShipmentService.palletRemoveTag(oPallet.labelNumber, organizationId, oDate, shipmentId, shipmentType, palletId).finally(function () {
				this._updateBindingShipment();

				//Nativa - refresh auxiliares - Carlos Aparicio
				this._auxiliaryMaterials();

				oListItem.setBusy(false);
			}.bind(this));
		},

		onMaterialShow: function (oEvent) {
			const oBinding = oEvent.getSource().getBindingContext('shipment')

			this.getFragment('Material').then(function (oFragment) {
				oFragment.setBindingContext(oBinding, 'parentList')
				oFragment.open()
			})
		},
		onMatAuxClose: function (oEvent) {

			const oBinding = oEvent.getSource().getBindingContext('material')

			if (oBinding) {
				const oParentBinding = oEvent.getSource().getBindingContext('parentList')
				const oItem = oBinding.getObject()
				const sParentPath = oParentBinding.sPath

				//Borramos la propiedad metadata				
				let { __metadata, ...oNewItem } = oItem
				//agregamos baseunit
				oNewItem = { ...oNewItem, baseUnit: oNewItem.baseUM }
				//borramos baseUm			
				let { baseUM, ...oFinalItem } = oNewItem

				this.getModel('shipment').setProperty(`${sParentPath}`, oFinalItem)
				oEvent.getSource().getParent().getParent().close()
			}
			oEvent.getSource().getParent().close()

		},


		onMatAuxSearch: function (oEvent) {
			const sValue = oEvent.getParameter('query')
			const oBinding = this.byId('matnrTable').getBinding('items')

			let aFilter = []
			if (sValue) {
				aFilter.push(new Filter('materialDescription', FilterOperator.Contains, sValue))
			}


			oBinding.filter(aFilter)
		},

		onPalletScanPress: function (oEvent) {
			BarcodeScanner.scan(
				function (mResult) {
					if (!mResult.cancelled) {
						this._assignLabelNumber(mResult.text);
					}
				}.bind(this),
				function (Error) {
					sap.m.MessageToast.show("Scanning failed: " + Error);
				}
			);
		}, onScanPress: function (oEvent) {

			this.getFragment("Scan").then(function (oFragment) {
				oFragment.open();
				//this.getView().byId("codigoDeBarras").focus();
				var oInput = this.byId("codigoDeBarras")
				jQuery.sap.delayedCall(500, this, function () { oInput.focus(); });
			}.bind(this));

		},
		onScanCancel: function () {
			this.getView().byId("codigoDeBarras").setValue("");
			this.getFragment("Scan").then(function (oFragment) {

				oFragment.close();
			});
		},
		onScanFillInput: async function (oEvent) {
			this.onGuardar();
			//Actualizacion Carlos Aparicio - 03.02.2026
			this.getView().byId("codigoDeBarras").focus();
			var codigoDeBarrasEscaneado = this.getView().byId("codigoDeBarras").getValue();


			// let aProducts = this.getModel('shipment').getProperty('/headerProduct')
			// let oShipmentModel = this.getModel();
			// let oContext = this.getView().getBindingContext("ShipmentService").getObject()
			// this._auxMaterialsScanSave(oEvent, aProducts, oShipmentModel, oContext, codigoDeBarrasEscaneado);

			//esto lo hago para eliminar los espacios entre los numeros
			codigoDeBarrasEscaneado = codigoDeBarrasEscaneado.toString();
			codigoDeBarrasEscaneado = codigoDeBarrasEscaneado.replace(/ /g, "");

			this._assignLabelNumber(codigoDeBarrasEscaneado, oEvent);
			// MessageToast.show(codigoDeBarrasEscaneado);

			this.getView().byId("codigoDeBarras").setValue("");
			this.getFragment("Scan").then(function (oFragment) {

				oFragment.close();
			});
		},

		_auxMaterialsScanSave: async function (oEvent, aProducts, oShipmentModel, oContext, codigoDeBarrasEscaneado) {
			let oEntry = {
				shipmentId: oContext.shipmentId,
				salesOrganizationId: oContext.salesOrganizationId,
				//shipmentDate: oContext.shipmentDate,
				//materialId: e.materialId,
				//quantity: e.quantity,
				//baseUnit: e.baseUnit
			}
			let sObjectPath = oShipmentModel.createKey("auxMaterialScanSet", {
				shipmentId: oContext.shipmentId,
				salesOrganizationId: oContext.salesOrganizationId,
				shipmentDate: oContext.shipmentDate,
				materialId: '123456', //codigoDeBarrasEscaneado,
				etiqueta: codigoDeBarrasEscaneado
			});

			return new Promise((resolve, reject) => {
				oShipmentModel.update(`/${sObjectPath}`, oEntry, {
					success: function (oData, response) {
						sap.m.MessageToast.show("Materiales auxiliares guardados correctamente.");
						resolve(response)
					}.bind(this),
					error: function (oError, response) {
						sap.m.MessageToast.show("Error al guardar materiales auxiliares.");
						reject(oError)
					}.bind(this)
				});
			});

			//this.getModel('detailView').setProperty('/busy', false);
			//this.getModel('detailView').refresh(true);


		},


		onPalletScanned: function (oEvent) {
			this._assignLabelNumber(oEvent.getParameter("barcode"));
		},

		_assignLabelNumber: function (sLabelNumber, oEvent) {
			var oView = this.getView(),
				//oPallet = oEvent.getSource().getBindingContext("ShipmentService").getObject(),
				oShipment = oView.getBindingContext("ShipmentService").getObject();
			const organizationId = oShipment.salesOrganizationId
			const oDate = this.formatter.formatDate(oShipment.shipmentDate)
			const shipmentId = oShipment.shipmentId
			const shipmentType = oShipment.shipmentType
			const palletId = 'X'
			oView.setBusy(true);

			const oParams = {
				method: 'POST',
				urlParameters: {
					labelNumber: sLabelNumber,
					salesOrganizationId: organizationId,
					shipmentDate: oDate,
					shipmentId: shipmentId,
					shipmentType: shipmentType,
					palletId: palletId
				}
			}

			this.getOdataModel().callFunction('/palletScan', oParams).then(function (oResponse, header) {
				const oUnparsedMessage = oResponse.headers ? oResponse.headers['sap-message'] : ''

				if (oUnparsedMessage) {
					const oMessage = JSON.parse(oResponse.headers['sap-message'])

					MessageBox[oMessage.severity == 'info' ? 'information' : 'warning'](oMessage.message, {
						actions: ["Confirmar", "Cancelar"],
						onClose: (sAction) => {
							const oContext = this.getView().getBindingContext("ShipmentService").getObject()
							const sOrganizationId = oContext.salesOrganizationId
							if (sAction == 'Cancelar') {
								this.getModel('detailView').setProperty('/busy', true)
								ShipmentService.palletRemoveTag(
									oResponse.data.labelNumber,
									// oResponse.data.salesOrganizationId, 
									sOrganizationId,
									this.formatter.formatDate(oResponse.data.shipmentDate),
									oResponse.data.shipmentId,
									oResponse.data.shipmentType,
									oResponse.data.palletId).finally(() => {
										this.getModel('detailView').setProperty('/busy', false)
									});
							}
						}
					})
				}
			}.bind(this)).catch(function (oError) {
				this.getMessageDialog().addResponse(oError);


			}.bind(this)).finally(function () {
				const oShipment = oView.getBindingContext("ShipmentService").getObject();
				this._bindPallets(oShipment);
				this._updateBindingShipment();

				//Nativa - refresh auxiliares - Carlos Aparicio
				this._auxiliaryMaterials();

				// Forzamos la pestaña
				var oTabBar = this.getView().byId('idIconTabBarFiori2');
				oTabBar.setSelectedKey('Transportes');

				// OPCIONAL: Quitar el foco de cualquier lado para evitar navegación por teclado
				if (document.activeElement) {
					document.activeElement.blur();
				}

				oView.setBusy(false);
				//Esto se hace para que no se pierda la posicion en pallet
				//document.activeElement.blur();
			}.bind(this));
		},


		onSelectionChange: async function (oEvent) {

			try {

				var alturaScroll = document.getElementById("application-PlanningShipment-display-component---shipmentDetail--dynamicPage-contentWrapper").scrollTop;
				localStorage['alturaScroll'] = alturaScroll.toString();
			} catch (error) {

			}


			var oListItem = oEvent.getSource().getParent(),
				oShipment = this.getView().getBindingContext("ShipmentService").getObject(),
				oPallet = oEvent.getSource().getBindingContext("ShipmentService").getObject()
			////// VERSION VIEJA
			// oListItem.setBusy(true);

			//await this.checkUncheckPallet(oShipment, oPallet)
			//oListItem.setBusy(false);


			//NUEVO DESARROLLO
			var estabaRepetido = false;
			var localoshipmentseleccionados = [];
			var localopalletseleccionados = [];
			if (oPallet.palletTypeDescription == "Mixto") {

				for (let index = 0; index < this.OSHIPMENTSELECCIONADO.length; index++) {
					if (JSON.stringify(this.OPALLETSELECCIONADO[index]) === JSON.stringify(oPallet)) {
						//console.log("REPETIDO")
						estabaRepetido = true;
					} else {
						localoshipmentseleccionados.push(this.OSHIPMENTSELECCIONADO[index])
						localopalletseleccionados.push(this.OPALLETSELECCIONADO[index])
					}
				}

				if (!estabaRepetido) {
					this.OSHIPMENTSELECCIONADO.push(oShipment);
					this.OPALLETSELECCIONADO.push(oPallet);
				} else {
					this.OSHIPMENTSELECCIONADO = localoshipmentseleccionados;
					this.OPALLETSELECCIONADO = localopalletseleccionados;
				}

			} else {
				oListItem.setBusy(true);
				// ===== ADAPTACION CRUD/DEEP ENTITY: switch global de prueba =====
				// Este era el gap pendiente: acá se dispara el check/uncheck de UN
				// pallet no-"Mixto" apenas se lo selecciona (no espera al botón
				// Guardar), así que también tiene que respetar el switch global
				// (testMode>/useCRUD) para que "aplique a todas las funciones que se
				// reemplazaron con las funciones CRUD", como pidió el usuario.
				if (this._isCRUDModeOn()) {
					await this.checkUncheckPalletCRUD(oShipment, oPallet);
				} else {
					await this.checkUncheckPallet(oShipment, oPallet)
				}
				oListItem.setBusy(false);
			}

			//console.log(this.OSHIPMENTSELECCIONADO)
			//console.log(this.OPALLETSELECCIONADO)

			//*/


		},
		onGuardar: async function (oEvent) {
			var that = this;
			var oView = that.getView();

			if (this.OSHIPMENTSELECCIONADO.length != 0) {

				try {
					var oViewModel = this.getModel("detailView");
					oViewModel.setProperty("/busy", true);
				} catch (error) {

				}

				for (let index = 0; index < this.OSHIPMENTSELECCIONADO.length; index++) {


					await that.checkUncheckPallet(that.OSHIPMENTSELECCIONADO[index], that.OPALLETSELECCIONADO[index])

					if (index == (this.OSHIPMENTSELECCIONADO.length - 1)) {
						setTimeout(() => {
							that.OSHIPMENTSELECCIONADO = [];
							that.OPALLETSELECCIONADO = [];
							oViewModel.setProperty("/busy", false);
						}, 4000);
					}

				}

			}

			//Modificacion Mejora 1 - Nativa Carlos Aparicio
			//Guardar Auxiliares
			let shipementStatus = this.getView().getBindingContext("ShipmentService").getObject().yardStatus;
			if (shipementStatus === 'pending' || shipementStatus === 'inCheck') {
				let aProducts = this.getModel('shipment').getProperty('/headerProduct')
				let oShipmentModel = this.getModel();
				let oContext = this.getView().getBindingContext("ShipmentService").getObject()
				this._auxiliaryMaterialsSave(oEvent, aProducts, oShipmentModel, oContext);
			}

		},
		_auxiliaryMaterialsSave: async function (oEvent, aProducts, oShipmentModel, oContext) {
			aProducts.forEach(function (e, i, a) {
				if (e.materialId && e.quantity) {

					let oEntry = {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: oContext.salesOrganizationId,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId,
						quantity: e.quantity,
						baseUnit: e.baseUnit
					}

					var sObjectPath = oShipmentModel.createKey("auxiliaryMaterials", {
						shipmentId: oContext.shipmentId,
						salesOrganizationId: oContext.salesOrganizationId,
						shipmentDate: oContext.shipmentDate,
						materialId: e.materialId
					});

					if (e.local === true) {
						oShipmentModel.create(`/auxiliaryMaterials`, oEntry, { groupId: "changes" })
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

			this.getModel('detailView').setProperty('/busy', true)

			let oSubmit = await new Promise(function (resolve, reject) {
				oShipmentModel.submitChanges({
					success: function (oData, response) {
						sap.m.MessageToast.show("Materiales auxiliares guardados correctamente.");
						resolve(response)
					}.bind(this),
					error: function (oError, response) {
						sap.m.MessageToast.show("Error al guardar materiales auxiliares.");
						reject(oError)
					}.bind(this)
				});
			})
			let newSubmit = oSubmit;
			this.getModel('detailView').setProperty('/busy', false)

		},


		checkUncheckPallet: async function (oShipment, oPallet) {
			var that = this;
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var sFunctionName = this.formatter.getFunctionImport(oShipment.yardStatus, oPallet.palletStatus);
			await this._getLocation()
			ShipmentService.callODataFunction(sFunctionName, {
				shipmentId: oPallet.shipmentId,
				shipmentType: oPallet.shipmentType,
				shipmentDate: this.formatter.formatDate(oPallet.shipmentDate),
				plantId: oPallet.plantId,
				palletId: oPallet.palletId,
				marketingStorageLocation: this.sLocation,
				packagingStorageLocation: this.sStore,
				salesOrganizationId: oShipment.salesOrganizationId,
				yardStatus: oShipment.yardStatus,
				palletType: oPallet.palletType

			}).catch(function (oError) {
				const oShipment = this.getView().getBindingContext("ShipmentService").getObject();
				this.getMessageDialog().addResponse(oError);
			}.bind(this)).finally(async function () {

				const oShipment = this.getView().getBindingContext("ShipmentService").getObject();
				await this._bindPallets(oShipment);
				//PRUEBA 810

				//this.getOwnerComponent().getModel('ShipmentService').refresh()

				await this._updateBindingShipment();
				oViewModel.setProperty("/busy", false);
				try {
					setTimeout(function () {
						//local
						//sap.ui.getCore().byId("container-project1---master").getController().onFilterConfirm()
						//document.getElementById("application-PlanningShipment-display-component---shipmentDetail--dynamicPage-contentWrapper").scrollTop = localStorage['alturaScroll'];
						//deployado
						if (sap.ui.getCore().byId("application-PlanningShipment-display-component---master")) {
							sap.ui.getCore().byId("application-PlanningShipment-display-component---master").getController().onFilterConfirm()
						}
						//that.onFilterConfirm();
					}, 50);
				} catch (error) {

				}





			}.bind(this));
		},

		getGroupHeader: function (oGroup) {


			var path = this.getView().getElementBinding("ShipmentService").getPath();
			var localpalletId = path[(path.length - 4)] + path[(path.length - 3)]

			let result = [];

			var fecha = new Date(this.VIAJEFECHA);

			//local
			//for(let i in this.getView().getModel("ShipmentService").getContext().oModel.oData)

			//deployado
			for (let i in this.getView().getModel("ShipmentService").oData)

				//local
				//result.push([i, this.getView().getModel("ShipmentService").getContext().oModel.oData [i]]); 

				//deployado
				result.push([i, this.getView().getModel("ShipmentService").oData[i]]);

			//console.log(result)

			/* 			COUNTER LOGIC*/
			var contador = 0;
			try {


				for (let index = 0; index < result.length; index++) {

					if (result[index][0].includes("planningShipments(") || result[index][0].includes("pallets(shipmentId(")) {
						result.splice(index, 1);
					}

					if (result[index][1].shipmentId == this.VIAJEID && result[index][1].palletTypeDescription == "Mixto" && String(result[index][1].shipmentDate) == fecha) {
						contador++;
					}

				}
			} catch (error) {

			}


			var satusViaje = this.getView().getBindingContext("ShipmentService").getObject().yardStatus

			if (oGroup.key == "Mixto") {
				return new sap.m.GroupHeaderListItem({
					title: oGroup.key,
					counter: contador
					//type: ( oContext.palletStatus === 'pending' || oContext.palletStatus === 'checked' || oContext.palletStatus === 'inCheck'  ) && oContext.palletType === 'M' ? 
					//	sap.m.ListType.Navigation : 
					//	sap.m.ListType.Inactive,
					//type: sap.m.ListType.Navigation
				});
			}
			if (oGroup.key == "Completo") {
				return new sap.m.GroupHeaderListItem({
					title: oGroup.key
					//type: ( oContext.palletStatus === 'pending' || oContext.palletStatus === 'checked' || oContext.palletStatus === 'inCheck'  ) && oContext.palletType === 'M' ? 
					//	sap.m.ListType.Navigation : 
					//	sap.m.ListType.Inactive,
					//type: sap.m.ListType.Navigation
				});
			}

		},

		getShipmentTypeGroup: function (oContext) {
			return oContext.getProperty("palletTypeDescription");
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function (oItem) {
			this.OSHIPMENTSELECCIONADO = [];
			this.OPALLETSELECCIONADO = [];
			//var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			const oPallet = oItem.getBindingContext("ShipmentService").getObject();
			this.getRouter().navTo("palletDetail", {
				shipmentId: oPallet.shipmentId,
				salesOrganizationId: this.getView().getBindingContext("ShipmentService").getProperty("salesOrganizationId"),
				plantId: oPallet.plantId,
				shipmentDate: JSON.stringify(oPallet.shipmentDate).replaceAll("\"", ""),
				shipmentType: oPallet.shipmentType,
				palletId: oPallet.palletId
			});
		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
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
					quantity: e.quantity,
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

			let oMaterial = {
				headerProduct: aMaterials
			}

			let oModel = new JSONModel();
			oModel.setData(oMaterial);
			this.getOwnerComponent().setModel(oModel, 'shipment');

			//Modificacion Mejora 1 - Nativa Carlos Aparicio
			//Guardamos una copia de los materiales auxiliares para validacion posterior
			let oModelAux = new JSONModel();
			oModelAux.setData({ headerProductAux: JSON.parse(JSON.stringify(aMaterials)) });
			this.getOwnerComponent().setModel(oModelAux, 'shipmentAux');
		},


		_onObjectMatched: function (oEvent) {
			this.PALLETSMIXTOS = [];
			var parameter = oEvent.getParameter("arguments");
			this.VIAJEID = parameter.shipmentId;
			this.VIAJEFECHA = parameter.shipmentDate;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getOwnerComponent().getModel("ShipmentService").metadataLoaded().then(function () {
				this._unbindPallets();
				var sObjectPath = this.getOwnerComponent().getModel("ShipmentService").createKey("planningShipments", {
					shipmentId: parameter.shipmentId,
					salesOrganizationId: parameter.salesOrganizationId,
					shipmentDate: parameter.shipmentDate
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			this._setPrecarga(parameter.shipmentId, parameter.salesOrganizationId, parameter.shipmentDate)
			let oShipmentModel = this.getModel()
			oShipmentModel.setUseBatch(true)

		},

		_setPrecarga: function (sId, sOrg, sDate) {

			const oParams = {
				urlParameters: {
					Fecha: sDate,
					OrganizationId: sOrg,
					Viaje: sId
				}
			}

			const oRead = this.getOdataModel('inload').callFunction('/PrecargaStatus', oParams)

			oRead.then((response) => {
				this.getModel('detailView').setProperty('/precargaEnabled', response.data.PrecargaEnabled === 'X')
			})

		},

		onPalletUpdateFinished: async function (oEvent) {
			var oViewModel = this.getModel("detailView");
			//oViewModel.setProperty("/busy", false)
			if (this.getView().getBindingContext("ShipmentService") !== undefined || this.getView().getBindingContext("ShipmentService") != null) {
				if (this.getView().getBindingContext("ShipmentService").getObject() !== undefined || this.getView().getBindingContext("ShipmentService").getObject() != null) {
					let sObject = this.getView().getBindingContext("ShipmentService").getObject();
					let sValida = await this._validaViaje(sObject.shipmentId, sObject.shipmentDate, sObject.shipmentType, sObject.salesOrganizationId);
					this._setYardStatus(sValida.editAux, sValida.interplanta);
				}
			}

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: async function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			// oViewModel.setProperty("/busy", false);
			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again


			await this.getView().bindElement({
				path: sObjectPath,
				model: "ShipmentService",
				events: {
					change: await this._onBindingChange.bind(this),
					dataRequested: function (e) {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: async function (e) {
						// 
						await this._auxiliaryMaterials()
						await this._setIconTab()


					}.bind(this)
				}
			});

		},

		_setIconTab: function () {
			const oModel = this.getModel('detailView')
			const bConsumo = this._isConsumoPressed()
			oModel.setProperty('/readKey', !bConsumo)
			oModel.setProperty('/consumoPressed', false)
		},


		_isConsumoPressed: function () {
			return this.getModel('detailView').getProperty('/consumoPressed')
		},

		_updateBindingShipment: async function () {
			const oHeader = this.getView().getElementBinding('ShipmentService').getBoundContext().getObject()
			const sId = oHeader.shipmentId
			const sOrg = oHeader.salesOrganizationId
			const sDate = oHeader.shipmentDate
			await this.getCurrentShipment(sId, sOrg, sDate)
		},

		_auxiliaryMaterials: async function () {
			var oViewModel = this.getModel("detailView");
			let aFilter = []
			const oContext = this.getView().getBindingContext("ShipmentService").getObject()
			aFilter.push(new Filter('shipmentId', FilterOperator.EQ, oContext.shipmentId))
			aFilter.push(new Filter('salesOrganizationId', FilterOperator.EQ, oContext.salesOrganizationId))
			aFilter.push(new Filter('shipmentDate', FilterOperator.EQ, oContext.shipmentDate))

			let oFilter = new Filter({
				filters:
					aFilter,
				and: true
			})

			let oParameters = {
				filters: [oFilter]
			}

			let oRead = this.getOdataModel().read('/auxiliaryMaterials', oParameters)
			await oRead.then(async function (response) {
				let aResults = []
				response.data ? aResults = response.data.results : aResults
				await this._setAuxTable(aResults)
				var oTabBar = this.getView().byId('idIconTabBarFiori2');
				oTabBar.setSelectedKey('Transportes');
			}.bind(this)).catch(async function (response) {
				let aResults = []
				await this._setAuxTable(aResults)
				var oTabBar = this.getView().byId('idIconTabBarFiori2');
				oTabBar.setSelectedKey('Transportes');
			}.bind(this)).finally(() => {
				oViewModel.setProperty("/busy", false);
			})


		},


		_validaViaje: async function (sId, sDate, sType, sSalesOrg) {

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
				return oData
				if (oData) {
					// if (this.getOwnerComponent().getModel('materialAuxModel')) { 
					// 	this.getOwnerComponent().setModel(new JSONModel({ editableMaterialAux: bEditableAux }), 'materialAuxModel'); 
					// }
				}

			} catch (oError) {
				// Manejar el error
				console.error("Error al leer datos:", oError);
			}

		},

		_setYardStatus: function (sEditAux, sInterplanta) {
			let oModel = this.getModel('detailView')
			//Carlos Aparicio 26.11.2025
			if (this.getView().getBindingContext("ShipmentService") !== undefined || this.getView().getBindingContext("ShipmentService") != null) {
				if (this.getView().getBindingContext("ShipmentService").getObject() !== undefined || this.getView().getBindingContext("ShipmentService").getObject() != null) {
					const sYardStatus = this.getView().getBindingContext("ShipmentService").getObject().yardStatus
					const bshipmentDeliveryEditable = this.getView().getBindingContext("ShipmentService").getObject().shipmentDeliveryEditable
					//bEditable, bVisible y bEnabledScan. Se agrega status 'Pending' - Agregamos bVisible en status 'Checked'

					const bEditableAux = sYardStatus === 'pending' || sYardStatus === 'inCheck' || sInterplanta === 'X' ? true : false;
					this.getOwnerComponent().setModel(new JSONModel({ editableMaterialAux: bEditableAux }), 'materialAuxModel');

					const bEditable = sEditAux === 'X' ? true : false; //sYardStatus === 'pending' || sYardStatus === 'inCheck' // sYardStatus === 'invoiced' ||

					const bVisible = sYardStatus === 'invoiced' || sYardStatus === 'arrived' || sYardStatus === 'checkedOut' || sYardStatus === 'arrived' || sYardStatus === 'pending' || sYardStatus === 'inCheck'
					const bEnabledScan = sYardStatus === 'invoiced' || sYardStatus === 'checked' || sYardStatus === 'pickingUp' || sYardStatus === 'pending'
					oModel.setProperty('/editable', bEditable)
					oModel.setProperty('/enabled', bEditable)
					oModel.setProperty('/visible', bVisible)
					oModel.setProperty('/readKey', bEnabledScan)
					oModel.setProperty('/shipmentDeliveryEditable', bshipmentDeliveryEditable)
				}
			}
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oViewModel = this.getModel("detailView"),
				oElementBinding = oView.getElementBinding("ShipmentService");

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oShipment = oElementBinding.getBoundContext().getObject();

			if (window.hasOwnProperty("cordova") && !BarcodeScanner.getStatusModel().getProperty("available") && (oShipment.yardStatus === "checked" || oShipment.yardStatus === 'pending')) {
				Scanner.getInstance().activate();
				Scanner.getInstance().attachScanned(this.onPalletScanned, this);
			}

			this._bindPallets(oShipment);
			oViewModel.setProperty("/yardStatus", oShipment.yardStatus);
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
		},

		_unbindPallets: function (oObject) {
			this._oGrid = this.byId("list.transport");
			this._oTemplate = this._oGrid.getBindingInfo("items").template;
			this._oGrid.unbindItems();
		},

		_bindPallets: function (oShipment) {
			var aFilters = [];

			if (oShipment.yardStatus === 'pending' || oShipment.yardStatus === 'inCheck') {
				aFilters.push(new Filter("palletType", FilterOperator.EQ, "M"));
			}
			aFilters.push(new Filter("salesOrganizationId", FilterOperator.EQ, oShipment.salesOrganizationId));
			aFilters.push(new Filter("shipmentId", FilterOperator.EQ, oShipment.shipmentId));
			aFilters.push(new Filter("plantId", FilterOperator.EQ, oShipment.plantId));
			aFilters.push(new Filter("shipmentDate", FilterOperator.EQ, oShipment.shipmentDate));
			this._oGrid.bindItems({
				path: "/pallets",
				model: "ShipmentService",
				parameters: {
					expand: 'components'
				},
				events: {
					dataReceived: (oEvent) => {
						const aMessages = oEvent.getSource().getModel().getMessagesByPath('/pallets')
						try {
							const aMessagesFiltered = aMessages.filter((e) => {
								return e.code !== 'SY/530'
							})

							if (aMessagesFiltered.length) {
								this.getMessageDialog().addMessagesFromArray(aMessagesFiltered)
								this.getRouter().navTo("master")
							}
						} catch (error) {

						}


					}
				},
				template: this._oTemplate,
				filters: aFilters,
				sorter: [
					new Sorter("palletType", false, this.getShipmentTypeGroup.bind(this)),
					new Sorter("palletId", false),
				],
				groupHeaderFactory: this.getGroupHeader.bind(this)
			});
		},

		_callShipmentAction(oEvent, sFunctionName) {
			let oView = this.getView(),
				oViewModel = this.getModel("detailView"),
				oShipment = oView.getBindingContext("ShipmentService").getObject();
			oView.setBusyIndicatorDelay(0);
			oView.setBusy(true);
			return new Promise(function (resolve, reject) {
				ShipmentService.callODataFunction(sFunctionName, {
					shipmentDate: this.formatter.formatDate(oShipment.shipmentDate),
					salesOrganizationId: oShipment.salesOrganizationId,
					shipmentId: oShipment.shipmentId
				}).then(function () {
					return ShipmentService.read(oView.getBindingContext("ShipmentService").getPath()).then(resolve, reject);
				}.bind(this)).catch(function (oError) {
					this.getMessageDialog().addResponse(oError);
					reject();
				}.bind(this)).finally(function () {
					const oShipment = oView.getBindingContext("ShipmentService").getObject();
					oViewModel.setProperty("/yardStatus", oShipment.yardStatus);
					this._bindPallets(oShipment);
					oView.setBusy(false);
				}.bind(this));
			}.bind(this));
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
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

		handleFacetFilterReset: function (oEvent) {
			var oFacetFilter = Element.registry.get(oEvent.getParameter("id")),
				aFacetFilterLists = oFacetFilter.getLists();

			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
			}

			this._applyFilter([]);
		},

		_applyFilter: function (oFilter) {

			const oParams = {
				filters: oFilter
			}

			const oRead = this.getOdataModel('material').read('/MaterialCodeSet', oParams)
			oRead.then((response) => {
				const aResults = response.data.results

				if (aResults) {
					const oFilter = aResults.map(function (e) {
						return new Filter('materialId', FilterOperator.EQ, e.materialId)
					})

					this.byId('matnrTable').getBinding('items').filter(oFilter, sap.ui.model.FilterType.Application)
				}
			})
			//const oTable = this.byId('matnrTable')
			//oTable.getBinding("items").filter(oFilter);
		},

		handleConfirm: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource();
			this._filterModel(oFacetFilter);
		},

		_filterSabor: function () {
			const oSabor = this.byId('Sabor')

			const oItem = this._obtenerItems()

			const oModel = this.getModel('detailView')


			if (oItem.Marca !== oItem.MarcaOld) {
				oModel.setProperty('/Marca', oItem.Marca)
				let aFilter = []
				oItem.Marca ? aFilter.push(new Filter('Marca', FilterOperator.EQ, oItem.Marca)) : ''
				oSabor.getBinding('items').filter(aFilter, sap.ui.model.FilterType.Application)
			}
		},

		_filterTamano: function () {
			const oTamano = this.byId('Tamano')

			const oItem = this._obtenerItems()

			const oModel = this.getModel('detailView')
			if (oItem.Marca !== oItem.MarcaOld || oItem.Sabor !== oItem.SaborOld) {
				oModel.setProperty('/Marca', oItem.Marca)
				oModel.setProperty('/Sabor', oItem.Sabor)
				let aFilter = []
				oItem.Marca ? aFilter.push(new Filter('Marca', FilterOperator.EQ, oItem.Marca)) : ''
				oItem.Sabor ? aFilter.push(new Filter('Sabor', FilterOperator.EQ, oItem.Sabor)) : ''
				oTamano.getBinding('items').filter(aFilter, sap.ui.model.FilterType.Application)
			}
		},

		_filterVenta: function () {
			const oVenta = this.byId('Venta')

			const oItem = this._obtenerItems()

			const oModel = this.getModel('detailView')

			if (oItem.Marca !== oItem.MarcaOld || oItem.Sabor !== oItem.SaborOld || oItem.Tamano !== oItem.TamanoOld) {
				oModel.setProperty('/Marca', oItem.Marca)
				oModel.setProperty('/Sabor', oItem.Sabor)
				oModel.setProperty('/Tamano', oItem.Tamano)

				let aFilter = []
				oItem.Marca ? aFilter.push(new Filter('Marca', FilterOperator.EQ, oItem.Marca)) : ''
				oItem.Sabor ? aFilter.push(new Filter('Sabor', FilterOperator.EQ, oItem.Sabor)) : ''
				oItem.Tamano ? aFilter.push(new Filter('Tamano', FilterOperator.EQ, oItem.Tamano)) : ''
				oVenta.getBinding('items').filter(aFilter, sap.ui.model.FilterType.Application)
			}
		},


		_obtenerItems: function () {
			const oSabor = this.byId('Sabor')
			const oSaborItem = oSabor.getSelectedItem()
			const sSaborId = oSaborItem ? oSaborItem.getBindingContext('material').getObject().SaborId : ''


			const oMarca = this.byId('Marca')
			const oMarcaItem = oMarca.getSelectedItem()
			const sMarcaId = oMarcaItem ? oMarcaItem.getBindingContext('material').getObject().MarcaId : ''

			const oTamano = this.byId('Tamano')
			const oTamanoItem = oTamano.getSelectedItem()
			const sTamanoId = oTamanoItem ? oTamanoItem.getBindingContext('material').getObject().TamanoId : ''

			const oModel = this.getModel('detailView')
			const oItems = {
				Sabor: sSaborId,
				Marca: sMarcaId,
				Venta: sTamanoId,
				SaborOld: oModel.getProperty('/Sabor'),
				MarcaOld: oModel.getProperty('/Marca'),
				TamanoOld: oModel.getProperty('/Tamano')
			}
			return oItems
		},


		_filterModel: async function (oFacetFilter) {
			var mFacetFilterLists = oFacetFilter.getLists().filter(function (oList) {
				return oList.getSelectedItems().length;
			});

			if (mFacetFilterLists.length) {
				await this._filterSabor()
				await this._filterTamano()
				await this._filterVenta()
				// Build the nested filter with ORs between the values of each group and
				// ANDs between each group
				var oFilter = new Filter(mFacetFilterLists.map(function (oList) {
					return new Filter(oList.getSelectedItems().map(function (oItem) {
						return new Filter(oList.getTitle(), "EQ", oItem.getKey());
					}), false);
				}), true);
				this._applyFilter([oFilter]);
			} else {
				this._applyFilter([]);
			}
		},

		/* =========================================================================
		 * ADAPTACIÓN CRUD / DEEP ENTITY — NO reemplaza checkUncheckPallet/onGuardar
		 * -------------------------------------------------------------------------
		 * Mismo rediseño ABAP que en PalletDetail.controller.js (ver el bloque
		 * equivalente ahí para el detalle completo del porqué). Acá el caso es a
		 * nivel PALLET COMPLETO: checkUncheckPallet hoy dispara un function import
		 * ('palletCheck'/'palletUncheck') que el backend resuelve internamente
		 * para TODOS los items del pallet; y cuando hay varios pallets "Mixto"
		 * tildados en pantalla (this.OSHIPMENTSELECCIONADO / OPALLETSELECCIONADO),
		 * onGuardar los procesa con un await secuencial por pallet — N pallets,
		 * N llamadas independientes, ninguna atómica entre sí.
		 *
		 * La Deep Entity de check/uncheck (mismo endpoint que en PalletDetail)
		 * necesita que el CLIENTE mande explícitamente los items del pallet
		 * (navegación checkUncheckNav), a diferencia del function import viejo
		 * que los resolvía él solo del lado servidor. Por eso estos métodos usan
		 * la lista "components" del pallet (ver expand:'components' en el
		 * binding de _bindPallets/_oTemplate): si por lo que sea ese expand no
		 * viene resuelto para un pallet puntual, hay que pasar aComponents
		 * explícitamente al invocar checkUncheckPalletCRUD.
		 *
		 * IMPORTANTE (pedido explícitamente): para que el guardado de VARIOS
		 * pallets sea realmente atómico -no una request por pallet como hoy-
		 * onGuardarCRUD agrupa todos los POST bajo un groupId de batch DEDICADO
		 * (_CHECK_UNCHECK_CONFIG.batchGroupId) registrado como grupo diferido
		 * recién acá, y dispara un único submitChanges(): o entran todos los
		 * pallets seleccionados en un mismo $batch cambio, o no entra ninguno.
		 * Este groupId es nuevo y exclusivo de este flujo — no toca el groupId
		 * "changes" que ya usa el resto del controller (auxiliaryMaterials, etc.),
		 * así que no cambia el comportamiento de nada de lo existente.
		 * ========================================================================= */

		_CHECK_UNCHECK_CONFIG: {
			// CONFIRMADO contra METADATA_SHIPPMENT.xml: Entity Set = "checkUncheckSet"
			// (no "checkUnchecks"). Las propiedades de checkUncheck/checkUncheckItem/
			// checkUncheckMessage van en PascalCase (ShipmentId, Checked, Success...),
			// distinto del resto del servicio que usa camelCase; solo los nombres de
			// navegación (checkUncheckNav/checkUncheckMessageNav) son camelCase.
			entitySet: "checkUncheckSet",
			navProperty: "checkUncheckNav",
			messageNavProperty: "checkUncheckMessageNav",
			batchGroupId: "checkUncheckChanges"
		},

		/**
		 * Arma el payload deep-entity (cabecera + navegación de items) para el
		 * POST único de check/uncheck a nivel pallet. Mismos campos que hoy manda
		 * checkUncheckPallet por urlParameters, tomados de oShipment/oPallet, pero
		 * en PascalCase (así quedó modelada la entidad checkUncheck en el
		 * $metadata real).
		 * aItems: [{ floor, materialId, checked }] (checked = true -> check, false -> uncheck)
		 */
		_buildCheckUncheckDeepPayload: function (oShipment, oPallet, aItems) {
			var oConfig = this._CHECK_UNCHECK_CONFIG;

			var oPayload = {
				ShipmentId: oPallet.shipmentId,
				PlantId: oPallet.plantId,
				ShipmentDate: oPallet.shipmentDate,
				ShipmentType: oPallet.shipmentType,
				PalletId: oPallet.palletId,
				MarketingStorageLocation: this.sLocation,
				PackagingStorageLocation: this.sStore,
				PalletType: oPallet.palletType,
				YardStatus: oShipment.yardStatus,
				SalesOrganizationId: oShipment.salesOrganizationId
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
		 * POST del deep-entity de check/uncheck. mParameters permite pasar
		 * groupId (para el batch atómico multi-pallet de onGuardarCRUD); sin
		 * groupId se manda de inmediato, igual que un create() normal.
		 */
		_createCheckUncheckDeepEntity: function (oPayload, mParameters) {
			var oModel = this.getView().getModel("ShipmentService");
			var oConfig = this._CHECK_UNCHECK_CONFIG;

			return new Promise(function (resolve, reject) {
				var mParams = Object.assign({}, mParameters, {
					success: function (oData) { resolve(oData); },
					error: function (oError) { reject(oError); }
				});
				oModel.create("/" + oConfig.entitySet, oPayload, mParams);
			});
		},

		/**
		 * Traduce los mensajes por item del deep-entity al MessageDialog que ya
		 * usa el resto de la app (mismo patrón que en PalletDetail.controller.js).
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
		 * Equivalente CRUD de checkUncheckPallet: UN pallet completo, UN POST
		 * deep-entity con todos sus items (en vez del function import
		 * 'palletCheck'/'palletUncheck'). aComponents es opcional: si no se pasa,
		 * se usa oPallet.components.results (requiere el expand:'components' del
		 * binding — ver comentario del bloque más arriba).
		 */
		checkUncheckPalletCRUD: async function (oShipment, oPallet, aComponents) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			await this._getLocation();

			var bChecked = this.formatter.getFunctionImport(oShipment.yardStatus, oPallet.palletStatus) === 'palletCheck';
			var aSourceComponents = aComponents || (oPallet.components && oPallet.components.results) || [];

			var aItems = aSourceComponents.map(function (oComponent) {
				return {
					floor: oComponent.floor,
					materialId: oComponent.materialId,
					checked: bChecked
				};
			});

			if (!aItems.length) {
				// Sin items no hay nada para mandar en la navegación del deep-entity:
				// probablemente el pallet no vino con components expandido. Se corta
				// acá en vez de mandar un POST vacío que el backend rechazaría.
				oViewModel.setProperty("/busy", false);
				return;
			}

			var oPayload = this._buildCheckUncheckDeepPayload(oShipment, oPallet, aItems);

			try {
				var oResponseData = await this._createCheckUncheckDeepEntity(oPayload);
				this._processCheckUncheckDeepEntityResponse(oResponseData);
			} catch (oError) {
				this.getMessageDialog().addResponse(oError);
			} finally {
				var oShipmentActual = this.getView().getBindingContext("ShipmentService").getObject();
				await this._bindPallets(oShipmentActual);
				await this._updateBindingShipment();
				oViewModel.setProperty("/busy", false);
			}
		},

		/**
		 * Equivalente CRUD de onGuardar: en vez de recorrer
		 * this.OSHIPMENTSELECCIONADO/OPALLETSELECCIONADO con un await secuencial
		 * por pallet (checkUncheckPallet, 1 function import cada uno), arma UN
		 * deep-entity por pallet seleccionado y los manda TODOS juntos en un
		 * único $batch/changeset atómico (ver comentario del bloque de arriba
		 * sobre batchGroupId): o se guardan todos los pallets tildados, o no se
		 * guarda ninguno.
		 */
		onGuardarCRUD: async function (oEvent) {
			if (!this.OSHIPMENTSELECCIONADO || !this.OSHIPMENTSELECCIONADO.length) {
				return;
			}

			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			await this._getLocation();

			var oModel = this.getView().getModel("ShipmentService");
			var oConfig = this._CHECK_UNCHECK_CONFIG;

			if (oModel.getDeferredGroups().indexOf(oConfig.batchGroupId) === -1) {
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat([oConfig.batchGroupId]));
			}

			var aPayloads = [];
			for (var i = 0; i < this.OSHIPMENTSELECCIONADO.length; i++) {
				var oShipment = this.OSHIPMENTSELECCIONADO[i];
				var oPallet = this.OPALLETSELECCIONADO[i];
				var bChecked = this.formatter.getFunctionImport(oShipment.yardStatus, oPallet.palletStatus) === 'palletCheck';
				var aComponents = (oPallet.components && oPallet.components.results) || [];

				var aItems = aComponents.map(function (oComponent) {
					return {
						floor: oComponent.floor,
						materialId: oComponent.materialId,
						checked: bChecked
					};
				});

				if (aItems.length) {
					aPayloads.push(this._buildCheckUncheckDeepPayload(oShipment, oPallet, aItems));
				}
			}

			if (!aPayloads.length) {
				oViewModel.setProperty("/busy", false);
				return;
			}

			// OJO: NO llamar getMessageDialog().addResponse() acá adentro. Cada
			// create() individual del changeset y el submitChanges() de más abajo
			// disparan SU PROPIO callback de error, y addResponse() hace
			// removeAllMessages() cada vez que se llama: si se llamara una vez por
			// cada create fallido Y otra vez desde el catch de submitChanges, la
			// segunda llamada (con el error genérico "a nivel changeset", sin el
			// mensaje real de negocio) BORRA los mensajes reales que ya se habían
			// agregado. En vez de eso, se guarda acá el error real de cada item
			// (el que sí trae, vía responseText, el message_container de la BAPI -
			// p.ej. el de close_pallet) y se muestra UNA sola vez más abajo.
			var aItemErrors = [];
			aPayloads.forEach(function (oPayload) {
				this._createCheckUncheckDeepEntity(oPayload, { groupId: oConfig.batchGroupId }).catch(function (oError) {
					aItemErrors.push(oError);
				});
			}.bind(this));

			try {
				await new Promise(function (resolve, reject) {
					oModel.submitChanges({
						groupId: oConfig.batchGroupId,
						success: function (oData) { resolve(oData); },
						error: function (oError) { reject(oError); }
					});
				});
			} catch (oError) {
				// Preferir el error real por item (con el mensaje de negocio real,
				// p.ej. el de close_pallet) sobre el error genérico agregado que
				// entrega submitChanges a nivel changeset.
				if (aItemErrors.length) {
					oError = aItemErrors[0];
				}
				this.getMessageDialog().addResponse(oError);
			} finally {
				this.OSHIPMENTSELECCIONADO = [];
				this.OPALLETSELECCIONADO = [];
				var oShipmentActual = this.getView().getBindingContext("ShipmentService").getObject();
				await this._bindPallets(oShipmentActual);
				await this._updateBindingShipment();
				oViewModel.setProperty("/busy", false);
			}
		},

		// ===== ADAPTACION CRUD/DEEP ENTITY: dispatcher del switch global =====
		// Handler enganchado en el botón "Guardar" del footer (bloque "handlers
		// NUEVOS" de ShipmentDetail.view.xml). Decide, según el switch global
		// (testMode>/useCRUD, leído vía BaseController._isCRUDModeOn()), si guarda
		// con la lógica CRUD nueva (batch atómico de deep-entities) o con la lógica
		// original (onGuardar, function imports secuenciales).
		onGuardarSwitch: function (oEvent) {
			if (this._isCRUDModeOn()) {
				return this.onGuardarCRUD(oEvent);
			}
			return this.onGuardar(oEvent);
		}

	});
});
sap.ui.define([], function () {
	"use strict";

	return {
		formatLabelNumber: function (sValue) {
			return parseInt(sValue, 10);
		},
		formatDate: function (oShipmentDate) {
			const oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyyMMddHHmmss", UTC: true })
			return oDateFormat.format(oShipmentDate);
		},
		formatDatePure: function (oShipmentDate) {
			const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyyMMdd", UTC: true })
			return oDateFormat.format(oShipmentDate);
		},
		formatLocalDatePure: function (oShipmentDate) {
			const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyyMMdd" })
			return oDateFormat.format(oShipmentDate);
		},


		isItemEnabled: function (palletStatus, itemstatus) {
			if(itemstatus == "missing"){
				return false
			}

			return palletStatus === "pending" || palletStatus === "" || palletStatus === "missing";

		},
		getPalletStatusState: function (yardStatus, palletStatus, palletType, labelNumber) {
			const RelevantStatusConditionFn = this.formatter.getRelevantStatusCondition.bind(this);
			// return RelevantStatusConditionFn(yardStatus, palletStatus) ? ((!!labelNumber || palletType === 'M') ? sap.ui.core.ValueState.Success : sap.ui.core.ValueState.Error) : sap.ui.core.ValueState.Warning;

			if ( yardStatus === 'pickedUp' && palletStatus === 'pickedUp') {
				return  sap.ui.core.ValueState.Success
			} else if(palletStatus === 'missing'){
				return sap.ui.core.ValueState.Error
			}
			else {
				return RelevantStatusConditionFn(yardStatus, palletStatus) ? sap.ui.core.ValueState.Success : sap.ui.core.ValueState.Warning;
			}				
		},
		getRelevantStatusCondition: function (parentStatus, status) {
			let condition = true;
			switch (parentStatus) {
				case "pending":
					condition = (status === "checked");
					break;
				case "inCheck":
					condition = (status === 'checked');
					break;
				case "checked":
					condition = (status === "pickedUp");
					break;
				case "pickingUp":
					condition = (status === "pickedUp");
					break;					
				case "pickedUp":
					condition = (status === "invoiced");
					break;
				case "invoiced":
					condition = (status === 'checkedOut' ) ;
					break;	
				case "":
					condition = (status === 'checked' ) ;
					break;	
			}
			return condition;
		},


		getIconStatusCondition: function( parentStatus, status) {
			
			const bCondition = this.formatter.getRelevantStatusCondition(parentStatus, status)	
			const sIcon = bCondition ? 'sap-icon://accept' : ''
			return sIcon
		},


		getFunctionImport: function (yardStatus, palletStatus) {
			let aIncludes = [];
			// if (yardStatus === "pending") {
			// 	aIncludes = ["checked", "pickedUp", "checkedOut"];
			// } else if (yardStatus === "checked") {       
			// 	aIncludes = ["pickedUp", "checkedOut"];
			// } else if (yardStatus === "pickedUp") {
			// 	aIncludes = ["checkedOut"];
			// }
			if (yardStatus === "pending") {
				aIncludes = ["checked"];
			} else if (yardStatus === "checked") {       
				aIncludes = ["pickedUp"];
			} else if (yardStatus === 'invoiced') {
				aIncludes = ['checkedOut']
			} else if (yardStatus === 'checkedOut') {
				aIncludes = ['checkedOut']
			} else if (yardStatus === 'inCheck') {
				aIncludes = [ 'checked' ]
			} else if (yardStatus === 'pickingUp') {
				aIncludes = [ 'pickedUp' ]
			} else if (yardStatus === 'pickedUp') {
				aIncludes = [ 'pickedUp' ]
			}
			return (aIncludes.includes(palletStatus)) ? "palletUncheck" : "palletCheck";
		},
		isPalletVisible: function (yardStatus, palletType) {
			return (yardStatus !== 'pending' || palletType === 'M');
		},
		getYardStatusState: function (code) {
			let sState = sap.ui.core.ValueState.Warning;
			switch (code) {
				case 'pickedUp':
				case "checkedOut":
				case "invoiced":
					sState = sap.ui.core.ValueState.Success;
					break;
			}
			return sState;
		},
		getYardStatusInverted: function (code) {
			return (code === "checked" || code === "checkedOut");
		},
		getComponentSelected: function (yardStatus, status) {
			const RelevantStatusConditionFn = this.formatter.getRelevantStatusCondition.bind(this);
			return RelevantStatusConditionFn(yardStatus, status);
		},
		getComponentStatusState: function (yardStatus, status) {
			const RelevantStatusConditionFn = this.formatter.getRelevantStatusCondition.bind(this);
			return RelevantStatusConditionFn(yardStatus, status) ? sap.ui.core.ValueState.Success : ((status === "missing") ? sap.ui.core.ValueState.Error : sap.ui.core.ValueState.Warning);
		},

		getPalletItemType: function (yardStatus, palletType) {
			let sType = sap.m.ListType.Navigation;
			if ((!yardStatus || yardStatus === "pending") && palletType === "C") {
				sType = sap.m.ListType.Inactive;
			}
			return sType;
		},
		toNumber: function (sText) {
            if (!isNaN(sText) && sText !== '') {
				sText = Number(sText)
			  }
			  return sText
		},
		removeLeadingZero: function (sText) {
			var nText = Number(sText)

			if ( !isNaN(nText) )  {
				sText = nText.toString()
			}

			if (sText == 0 ) {
				sText = ''
			}
			return sText
		},

		checkLabel: function(bConfirmed,sFab, sNumero) {

			const sText = `${sFab} - ${sNumero}`

			return bConfirmed ? sText : 'Confirmar Etiqueta' 
		},

		formatCompleteText: function(sText) {
			let sButtonText
				const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle()
			switch (sText) {
				case '':
				case 'pending':
				case 'inCheck':
					sButtonText = oBundle.getText('shipmentDetail.action.shipmentCheck')
					break
				case 'checked':
				case 'pickedUp':
				case 'pickingUp':
					sButtonText = oBundle.getText('shipmentDetail.action.shipmentInvoice')
					break
				case 'invoiced':
					sButtonText = oBundle.getText('shipmentDetail.action.shipmentCheckout')
					break
				default:
					sButtonText = oBundle.getText('shipmentDetail.action.shipmentComplete')
			}
			return sButtonText
		},

		formatMaterialData: function(data) {
			//console.log("formatMaterialData")
			var aComponents = data.components.__list;
			const oComponent = this.getView().getModel('ShipmentService').getProperty('/' + aComponents[0])
			let sQuantityText

			if(data.labelNumber ){
				sQuantityText = oComponent.palletType == 'C' ? `${oComponent.quantity} /  ${oComponent.quantity} PCK` : `${oComponent.quantity} /  ${oComponent.quantity}`
			}else{
				sQuantityText = oComponent.palletType == 'C' ? `${oComponent.observedQuantity} /  ${oComponent.quantity} PCK` : `${oComponent.observedQuantity} /  ${oComponent.quantity}`
			}
			return sQuantityText

		},
		formatCounter: function(data){
			return 777;
		}
	};
});
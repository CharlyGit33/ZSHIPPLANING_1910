sap.ui.define([
  "sap/m/Input"
], function (
  Input
) {
  "use strict";

  var FocusInput = Input.extend('zinload.controls.FocusInput', {
    metadata: {
      events: {
        focusout: {}
      },
      properties: {
      },
    },

    renderer: {},

    onAfterRendering: function(evt) {
      if (sap.m.Input.onAfterRendering) {
        sap.m.Input.onAfterRendering.apply(this, arguments);
      }
  

      // this.$().find('input').focusout(function() {
      //   this.fireEvent('focusout');
      // }.bind(this));
    } 
  });

  FocusInput.prototype.onsapfocusleave = function(evt) {
    this.fireEvent('focusout')
  }
  
  // FocusInput.prototype.onfocusout = function(evt) { 

  //   this.fireEvent('focus') 

  // } 



  return FocusInput;
});

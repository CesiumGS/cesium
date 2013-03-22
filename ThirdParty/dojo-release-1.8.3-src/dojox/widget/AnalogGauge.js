// backward compatibility for dojox.widget.AnalogGauge
dojo.provide("dojox.widget.AnalogGauge");
dojo.require("dojox.widget.gauge._Gauge");

dojo.require("dojox.gauges.AnalogGauge");
dojox.widget.AnalogGauge = dojox.gauges.AnalogGauge;
dojox.widget.gauge.AnalogLineIndicator = dojox.gauges.AnalogLineIndicator;

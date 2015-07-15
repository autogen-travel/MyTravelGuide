


/* global window */
(function(w){
    'use strict';
	
    w.angular.module('myMap',['ui.sortable'])
		.config(function($interpolateProvider) {
			$interpolateProvider.startSymbol('{!');
			$interpolateProvider.endSymbol('!}');
		})
        .controller('mapC',function($scope){
            var scope = $scope;
            scope.map = w.L.map('map').setView([55.751244, 37.618423], 15);
            w.L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(scope.map);
            scope.map.on('click',function(e){
                scope.popup = w.L.popup()
                    .setLatLng(e.latlng)
                    .setContent(scope.newPointForm())
                    .openOn(scope.map);
                w.$("input[type=text]").focus();
            });
            scope.newPointForm = function(){
                var root = w.$("<form/>",{submit:function(e){
                    e.preventDefault();
                    new Point(w.$("form input[type=text]").val());
                }});
                w.$("<input/>",{class: "form-control",type: "text",placeholder:'Название точки'}).appendTo(root);
                w.$("<input/>",{class: "btn btn-success btn-sm",type:"submit",value:"Добавить к маршруту"}).appendTo(root);
                return root[0];
            };

            function Point(title){
                if(!title) return false;
                var point = this;
                this.title = title;
                this.order = scope.points.length;
                this.coord = scope.popup.getLatLng();
                this.toString = function(){
                    return [this.order,this.title,this.coord.lat,this.coord.lng].join(" | ");
                };
                this.toJSON = function(){
                    return { order: point.order, title: point.title, lat: point.coord.lat, lng: point.coord.lng };
                };
                this.newRemoveForm = function(){
                    var root = w.$("<div/>");
                    w.$("<h3/>").html(point.title).appendTo(root);
                    w.$("<button/>",
                        { class:"btn btn-danger",
                          click: function(){
                              scope.points.splice(scope.points.indexOf(point),1);
                              scope.map.removeLayer(point.marker);
                              scope.$apply();
                              scope.map.closePopup();
                          }
                        }).html("Убрать из маршрута").appendTo(root);
                    return root[0];
                };
                scope.points.push(this);
                this.marker = w.L.marker(scope.popup.getLatLng()).addTo(scope.map);
                this.marker.bindPopup(this.newRemoveForm()).openPopup();
                scope.map.closePopup();
                scope.$apply();
				console.log(this);
                return this;
            }
            scope.points = [];
            scope.$watchCollection('points',function(v){
                w.console.log(w.JSON.stringify(v.map(function(x){ return x.toJSON(); })));
                v.forEach(function(x,i){
                    x.order = i;
                });
            });
        })
    ;
})(window);

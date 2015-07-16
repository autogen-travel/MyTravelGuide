/* global window */
(function(w){
    'use strict';
    w.angular.module('myMap',['ui.sortable'])
        .controller('mapC',function($scope,$compile,$http){
            var scope = $scope;
            scope.map = w.L.map('map').setView([55.751244, 37.618423], 15);
            w.L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(scope.map);
            scope.map.on('click',function(e){
                // scope.inProgress = true;
                $http.get('tpl/form.html').success(function(x){
                    var point = new Point(e.latlng);
                    scope.popup = w.L.popup({ maxWidth:500, minWidth: 500, autoPan: true, keepInView: false})
                        .setLatLng(e.latlng)
                        .setContent($compile(w.angular.element(x))(point)[0])
                        .openOn(scope.map);
                    w.$(".fake").on("change",handleFiles);
                    w.$("form").on("submit",point.save);
                    w.$("input[type=text]").focus();
                });

            });
            scope.categories = ["Museum","Hotel","Zoo","Gallery","Other"];
            scope.currency = ["USD","EUR","RUB"];
            scope.newPointForm = function(){
                var root = w.$("<form/>",{submit:function(e){
                    e.preventDefault();
                    new Point(w.$("form input[type=text]").val());
                }});
                w.$("<input/>",{class: "form-control",type: "text",placeholder:'Название точки'}).appendTo(root);
                w.$("<input/>",{class: "btn btn-success btn-sm",type:"submit",value:"Добавить к маршруту"}).appendTo(root);
                return root[0];
            };
            function Point(coord){
                var local = scope.$new();
                local.order = scope.points.length;
                local.coord = coord;
                local.showExtra = false;
                local.currency = "USD";
                local.images = [];
                local.country = "loaded...";
                local.city = "loaded...";
                local.region = "loaded...";
                local.toJSON = function(){
                    return { order: local.order, title: local.title, lat: local.coord.lat, lng: local.coord.lng };
                };
                local.toString = function(){
                    return [local.order,local.title,local.coord.lat,local.coord.lng].join(" ");
                };
                local.newRemoveForm = function(){
                    var root = w.$("<div/>");
                    w.$("<h3/>").html(local.title).appendTo(root);
                    w.$("<button/>",
                        { class:"btn btn-danger",
                          click: function(){
                              scope.points.splice(scope.points.indexOf(local),1);
                              scope.map.removeLayer(local.marker);
                              scope.$apply();
                              scope.map.closePopup();
                          }
                        }).html("Убрать из маршрута").appendTo(root);
                    return root[0];
                };
                local.save = function(ev){
                    console.log(w.JSON.stringify($("form").serializeArray()));
                    scope.points.push(local);
                    local.marker = w.L.marker(scope.popup.getLatLng()).addTo(scope.map);
                    local.marker.bindPopup(local.newRemoveForm()).openPopup();
                    scope.map.closePopup();
                    scope.$apply();
                    $(ev.target).ajaxSubmit({success:function(x){console.log(x);},error:function(x){console.log("please, set correct form action url");}});
                    return false;
                };
                $http.get("https://nominatim.openstreetmap.org/reverse?format=json&lat="+local.coord.lat+"&lon="+local.coord.lng+"&zoom=10&addressdetails=1")
                    .success(function(rsp){
                        local.country = rsp.address.country;
                        local.city = rsp.address.state;
                        local.region = rsp.address.city;
                    })
                    .error(function(err){
                        return false;
                    });
                ;
                return local;
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

function handleFiles(ev){
    if(ev.target.files.length > 0){
        Array.prototype.forEach.call(ev.target.files,function(f){
            var v = new FileReader();
            v.onload = function(d){
                $("<img/>",{src:d.target.result}).appendTo(".images");
            };
            v.onerror = function(e){
                return false;
            };
            v.readAsDataURL(f);
        });
    }
    return false;
};

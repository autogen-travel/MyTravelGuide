/* global window */
(function(w){
    'use strict';
    w.angular.module('myMap',['codemwnci.markdown-edit-preview'],function($interpolateProvider) {
        $interpolateProvider.startSymbol('{!');
        $interpolateProvider.endSymbol('!}');
    }).controller('mapC',function($scope,$compile,$http){
        var scope = $scope;
        // application config
        scope.config = {
            centeredPopups: true
        };
        // TODO: move me into a service that returns a map instance
        // create new leaflet map instance
        scope.map = w.L.map('map',{zoomControl:false}).setView([55.751244, 37.618423], 15);
        // setup zoom control
        w.L.control.zoom({position: "bottomleft"}).addTo(scope.map);
        // setup geocoder control
        var geocoder = w.L.Control.geocoder({collapsed:false,position:'topleft'}).addTo(scope.map);
        // setup geocoder callback
        geocoder.markGeocode = function(rsp){
            scope.map.setView(rsp.center,scope.map.getZoom());
            return false;
        };
        // setup map layer
        w.L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(scope.map);
        // register map onclick handler
        scope.addNewPlace = function(e){
            scope.hideSidebar({force:true});
            $http.get('tpl/newform-meta.html').success(function(rsp){
                scope.popup = w.L.popup({ maxWidth:500, minWidth: 500, autoPan: true, keepInView: true, closeOnClick: false})
                    .setLatLng(e.latlng)
                    .setContent($compile(w.angular.element(rsp))(scope)[0])
                    .openOn(scope.map);
                if(scope.config.centeredPopups) scope.map.setView(e.latlng,scope.map.getZoom());
                new Point2(e.latlng);
            });
        };
        scope.map.on('click',scope.addNewPlace);
        // we do not add markers immediately on points creation, because marker to will close popup
        scope.showPlaces = function(e){
            var existedPlaces = scope.findPointByCoord(e.latlng);
            if(existedPlaces.length > 0){
                $http.get('tpl/show-meta.html').success(function(rsp){
                    var marker = w.L.marker(e.latlng).addTo(scope.map),
                        popup = w.L.popup({ maxWidth:500, minWidth: 500, autoPan: true, keepInView: false, closeOnClick: false})
                            .setContent($compile(w.angular.element(rsp))(scope)[0])
                    ;
                    marker.bindPopup(popup).openPopup();
                    marker.on('remove',function(){
                        scope.showPlaces({latlng: e.latlng});
                    });
                    scope.showControls = existedPlaces.length > 1;
                    existedPlaces.forEach(function(x,i){
                        x.marker = marker;
                        w.$("<li/>",{"data-target": "#carousel-example-generic","data-slide-to": i,class: i === 0 ? "active" : ""}).appendTo(w.$(".carousel-indicators"));
                        x.render.show(i === 0);
                    });
                });
            }
        };
        scope.map.on('popupclose',function(){
            if(scope.popup){
                var existedPlaces = scope.findPointByCoord(scope.popup.getLatLng());
                if(existedPlaces.length > 0){ scope.showPlaces({latlng: scope.popup.getLatLng()}); delete(scope.popup); }
            }
        });
        scope.categories = ["Museum","Hotel","Zoo","Gallery","Castle","Restaurant","Ruines","Other"];
        scope.currency = ["USD","EUR","RUB"];
        scope.addAnotherPlace = function(){
            if(scope.popup) new Point2(scope.popup.getLatLng());
        };
        scope.findPointByCoord = function(coord){
            return scope.points.filter(function(x){ return x.coord.lat == coord.lat && x.coord.lng == coord.lng; });
        };        
        // TODO: move me into a separate service
        scope.showSidebar = function(){
            scope.map.closePopup();
            w.$(".sidebar-fixed").removeClass("hidden");
            // scope.findPointByCoord(coord).forEach(function(x,i){ x.render.edit(i); });
            w.document.addEventListener("keydown",scope.hideSidebar);
        };
        scope.hideSidebar = function(ev){
            if(ev.force || ev.keyCode === 27){
                w.$(".sidebar-fixed").addClass("hidden");
                w.$(".sidebar-content").html('');
                w.document.removeEventListener("keydown",scope.hideSidebar);
            }
            return false;
        };
        
        function Point2(coord){
            // TODO: 1) comment me 2) move me into a separate service
            var local = scope.$new();
            local.coord = coord;
            local.images = [];
            local.thumbnails = [];
            local.toJSON = function(){ return { order: local.order, title: local.title, lat: local.coord.lat, lng: local.coord.lng }; };
            local.cover = function(){ return local.thumbnails.length > 0 ? local.thumbnails[0] : "img/noimage.png"; };
            local.makeThumbnails = function(t,ev){
                if(ev.target.files.length > 0){
                    Array.prototype.forEach.call(ev.target.files,function(f){
                        var v = new w.FileReader();
                        v.onload = function(d){
                            local.thumbnails.push(d.target.result);
                            local.$apply();
                        };
                        v.onerror = function(){ return false; };
                        v.readAsDataURL(f);
                    });
                }
                return false;
            };
            local.removeThumb = function(i){
                local.thumbnails.splice(i,1);
            };
            local.render = {};            
            local.render.new = function(){
                $http.get("https://nominatim.openstreetmap.org/reverse?format=json&lat="+local.coord.lat+"&lon="+local.coord.lng+"&zoom="+scope.map.getZoom()+"&addressdetails=1")
                    .success(function(rsp){
                        var title = false, address = [];
                        if(rsp.address){
                            title = rsp.address[Object.keys(rsp.address)[0]];
                            address = Object.keys(rsp.address).slice(1).map(function(x){ return rsp.address[x];});
                        }
                        local.title = title ? title : rsp.display_name;
                        local.address = address.join(',');
                        $http.get("tpl/newform.html")
                            .success(function(rsp){
                                w.$(".meta-container .preloader").remove();
                                w.$(".meta-container").html('');
                                $compile(w.angular.element(rsp))(local).appendTo(w.$(".meta-container"));
                            })
                        ;
                    })
                    .error(function(err){ w.console.log("GEOCODER ERROR!",err); })
                ;
            };
            local.render.show = function(active){
                local.active = active;
                $http.get("tpl/show.html")
                    .success(function(rsp){ $compile(w.angular.element(rsp))(local).appendTo(w.$(".carousel-inner")); })
                ;
            };
            local.render.edit = function(index){
                scope.showSidebar();
                local.index = index; // we using this variable only for form label links
                $http.get('tpl/editform.html')
                    .success(function(rsp){ $compile(w.angular.element(rsp))(local).appendTo(w.$(".sidebar-content")); })
                ;
            };
            local.save = function(ev,update){
                ev.preventDefault();
                if(!update) {
                    scope.points.push(local);
                } else {
                    local.showWarning = true;
                }
                var form = w.$(ev.target);
                w.console.log(w.JSON.stringify(form.serializeArray()));
                if(!update) {
                    scope.addAnotherPlace();
                    // if(w.$(".meta-container form").length === 0) scope.map.closePopup();
                }
                w.$(form).ajaxSubmit({success:function(x){w.console.log(x);},error:function(){w.console.log("please, set correct form action url");}});
            };
            local.destroy = function(){
                if(!local.showWarning || (local.showWarning && w.confirm("Уверены, что хотите удалить место?"))){
                    scope.points.splice(scope.points.indexOf(local),1);
                    scope.map.closePopup();
                    scope.map.removeLayer(local.marker);
                }
            };
            local.render.new();
        }
        scope.points = [];
    })
    ;
})(window);

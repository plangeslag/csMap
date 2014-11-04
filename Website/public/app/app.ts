﻿module App {
    'use strict';

    import IFeature = csComp.GeoJson.IFeature;

    export interface IAppLocationService extends ng.ILocationService {
        $$search: { layers: string };
    }

    export interface IAppScope extends ng.IScope {
        vm           : AppCtrl;
        title        : string;
        showMap      : boolean;
        showMenuRight: boolean;
        featureSelected: boolean;
    }

    // TODO For setting the current culture for string formatting (note you need to include public/js/cs/stringformat.YOUR-CULTURE.js. See sffjs.1.09.zip for your culture.) 
    declare var sffjs;  
    declare var String;

    export class AppCtrl {
        public showMap: boolean = true;

        // $inject annotation.
        // It provides $injector with information about dependencies to be injected into constructor
        // it is better to have it close to the constructor, because the parameters must match in count and type.
        // See http://docs.angularjs.org/guide/di
        public static $inject = [
            '$scope',
            '$location',
            'mapService',
            'layerService',
            'messageBusService'
        ];

        // dependencies are injected via AngularJS $injector
        // controller's name is registered in Application.ts and specified from ng-controller attribute in index.html
        constructor(
            private $scope            : IAppScope,
            private $location         : IAppLocationService,
            private $mapService       : csComp.Services.MapService,
            private $layerService     : csComp.Services.LayerService,
            private $messageBusService: csComp.Services.MessageBusService
        ) {
            //console.log('$location: ' + JSON.stringify($location));
            //console.log('$$search : ' + JSON.stringify($location.$$search));
            //console.log('layers   : ' + JSON.stringify($location.$$search.layers));

            sffjs.setCulture("nl-NL");
            
            $scope.vm = this;
            $scope.showMenuRight = false;
            $scope.featureSelected = false;

            $messageBusService.subscribe("project", () => {
                // NOTE EV: You may run into problems here when calling this inside an angular apply cycle.
                // Alternatively, check for it or use (dependency injected) $timeout.
                // E.g. if (this.$scope.$root.$$phase != '$apply' && this.$scope.$root.$$phase != '$digest') { this.$scope.$apply(); }
                $scope.$apply();
            });

            $messageBusService.subscribe("sidebar", this.sidebarMessageReceived);
            $messageBusService.subscribe("feature", this.featureMessageReceived);
            $messageBusService.subscribe("layer", this.layerMessageReceived);

            this.$layerService.openSolution("data/projects/projects.json", $location.$$search.layers);
            $messageBusService.notify('Welcome to csMap', 'Your mapping solution.');

            this.showMap = this.$location.path() === "/map";
        }

        /**
         * Publish a toggle request.
         */
        public toggleMenuRight() {
            this.$messageBusService.publish("sidebar", "toggle");
        }

        private layerMessageReceived = (title:string, layer: csComp.Services.ProjectLayer): void => {
            switch(title) {
                case "deactivate":
                    break;
            }

            // NOTE EV: You need to call apply only when an event is received outside the angular scope.
            // However, make sure you are not calling this inside an angular apply cycle, as it will generate an error.
            if (this.$scope.$root.$$phase != '$apply' && this.$scope.$root.$$phase != '$digest') {
                this.$scope.$apply();
            }
        }

        private featureMessageReceived = (title: string): void => {
            switch (title) {
                case "onFeatureSelect":
                    this.$scope.featureSelected = true;
                    break;
                case "onFeatureDeselect":
                    this.$scope.featureSelected = false;
                    break;
            }

            // NOTE EV: You need to call apply only when an event is received outside the angular scope.
            // However, make sure you are not calling this inside an angular apply cycle, as it will generate an error.
            if (this.$scope.$root.$$phase != '$apply' && this.$scope.$root.$$phase != '$digest') {
                this.$scope.$apply();
            }
        }

        /** 
         * Callback function
         * @see {http://stackoverflow.com/questions/12756423/is-there-an-alias-for-this-in-typescript}
         * @see {http://stackoverflow.com/questions/20627138/typescript-this-scoping-issue-when-called-in-jquery-callback}
         * @todo {notice the strange syntax, which is to preserve the this reference!}
         */
        private sidebarMessageReceived = (title: string): void => {
            switch (title) {
            case "toggle":
                this.$scope.showMenuRight = !this.$scope.showMenuRight;

                break;
            case "show":
                this.$scope.showMenuRight = true;
                break;
            case "hide":
                this.$scope.showMenuRight = false;
                break;
            default:
            }
        }

        public toggleMenu(): void {
            this.$mapService.invalidate();
        }

        public toggleSidebar(): void {
            this.$messageBusService.publish("sidebar", "toggle");
            window.console.log("Publish toggle sidebar");
        }

        public showTable() {
            this.$scope.showMap = false;
        }

        public isActive(viewLocation: string) {
            return viewLocation === this.$location.path();
        }
    }

    // http://jsfiddle.net/mrajcok/pEq6X/
    declare var google;

    // Start the application
    angular.module('csWebApp', [
            'ui.router',
            'ui.bootstrap',
            'LocalStorageModule',
            'angularUtils.directives.dirPagination',
            'csWeb.featureprops',
            'csWeb.layersDirective',
            'csWeb.featureList',
            'csWeb.filterList',
            'csWeb.baseMapList',
            'csWeb.styleList',
            'csWeb.legendList',
            'csWeb.resize',
            'csWeb.datatable',
            'ngCookies'
        ])
        .config(localStorageServiceProvider => {
            localStorageServiceProvider.prefix = 'csMap';
        })
        .config(($stateProvider, $urlRouterProvider) => {
            // For any unmatched url, send to /
            $urlRouterProvider.otherwise("/map");
            $stateProvider
                .state('map', {
                    url: "/map?layers",
                    templateUrl: "views/map/map.html",
                    sticky: true,
                    deepStateRedirect: true
                })
                .state('table', {
                    url: "/table",
                    template: "<datatable id='datatable'></datatable>",
                    sticky: true
                });
        })
        .controller('appCtrl', AppCtrl)
        .controller('mapLayersCtrl', csComp.Services.MapCtrl)
        .controller('searchFormCtrl', csComp.Search.SearchFormCtrl)
        .controller('mapViewCtrl', MapView.MapViewCtrl)
        .controller('searchCtrl', Search.SearchCtrl)
        .service('messageBusService', csComp.Services.MessageBusService)
        .service('mapService', csComp.Services.MapService)
        .service('layerService', csComp.Services.LayerService)
        .filter('csmillions', [
            '$filter', '$locale', function(filter, locale) {
                return function(amount, currencySymbol) {
                    if (isNaN(amount)) return "";
                    var millions = amount / 1000000;

                    return String.format("{0:N1}", millions);
                };
            }
        ])
        .filter('format', [
            '$filter', '$locale', function(filter, locale) {
                return function(value, format) {
                    return String.format(format, value);
                };
            }
        ])
        .directive('percentage', function() {
            return {
                require: 'ngModel',
                link: function(scope, element, attrs, ngModelController) {
                    ngModelController.$parsers.push(function(data) {
                        if (data == null) return 0;
                        return parseInt(data.replace('%', '')) / 100; //converted
                    });

                    ngModelController.$formatters.push(function(data) {
                        if (data == null) return '';
                        return Math.round((data * 100)) + '%'; //converted
                    });
                }
            }
        })
        //.directive('googlePlaces', () => {
        //    return {
        //        restrict: 'E',
        //        replace: true,
        //        // transclude:true,
        //        scope: { location: '=' },
        //        template: '<input id="searchbox" type="text" placeholder="Zoek..." autocomplete="off" spellcheck="false" dir="auto" style="position: relative; vertical-align: top;" class="form-control tt-input"/>',
        //        //template: '<input id="google_places_ac" name="google_places_ac" type="text" class="input-block-level"/>',
        //        link: ($scope, elm, attrs) => {
        //            var autocomplete = new google.maps.places.Autocomplete($("#searchbox")[0], {});
        //            google.maps.event.addListener(autocomplete, 'place_changed', () => {
        //                var place = autocomplete.getPlace();
        //                $scope.location = new L.LatLng(place.geometry.location.lat(), place.geometry.location.lng());
        //                //$scope.location = place.geometry.location.lat() + ',' + place.geometry.location.lng();
        //                $scope.$apply();
        //            });
        //        }
        //    }
        //})
        //.directive('bsPopover', () => {
        //    return (scope, element, attrs) => {
        //        element.find("a[rel=popover]").popover({ placement: 'right', html: 'true' });
        //    };
        //})
        .directive('ngModelOnblur', () => {
            return {
                restrict: 'A',
                require: 'ngModel',
                priority: 1, // needed for angular 1.2.x
                link: (scope, elm, attr, ngModelCtrl) => {
                    if (attr.type === 'radio' || attr.type === 'checkbox') return;
                    elm.unbind('input').unbind('keydown').unbind('change');
                    elm.bind('blur', () => {
                        scope.$apply(() => {
                            ngModelCtrl.$setViewValue(elm.val());
                        });
                    });
                }
            };
        });
}
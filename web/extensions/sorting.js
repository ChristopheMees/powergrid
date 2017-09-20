define(['../override', 'jquery', '../utils', '../datasources/sortingdatasource.js'], function(override, $, utils, SortingDataSource) {
    'use strict';

    return {
        loadFirst: ['dragging', 'columnsizing'],
        init: function(grid, pluginOptions) {
            override(grid, function($super) {
                var sortColumns=[];
                function loadSettings() {
                    var sortSettings = grid.loadSetting('sorting');
                    if (sortSettings !== undefined && sortSettings !== null && sortSettings !== '') {
                        sortColumns = sortSettings;
                    }
                }
                return {
                    init: function() {
                        loadSettings();

                        if(typeof this.dataSource.sort !== 'function') {
                            this.dataSource = new SortingDataSource(this.dataSource);
                        }

                        $super.init();
                        this.container.on('click', '.pg-columnheader', function(event) {
                            var key = $(this).attr('data-column-key'),
                                col = grid.getColumnForKey(key),
                                direction;

                            if(sortColumns[0] && sortColumns[0].key === key) {
                                direction = sortColumns[0].direction;
                            }

                            if(direction == 'ascending') {
                                direction = 'descending';
                            } else {
                                direction = 'ascending';
                            }

                            grid.target.find('.pg-sort-ascending, .pg-sort-descending').removeClass('pg-sort-ascending pg-sort-descending');
                            $(this).addClass('pg-sort-' + direction);

                            sortColumns = [{ key: key, direction: direction }].concat(sortColumns.filter(function(e) {
                                return e.key !== key;
                            }));
                            grid.sorting.sort(sortColumns);
                            grid.saveSetting('sorting', sortColumns);
                        });

                        $(grid.dataSource).one('dataloaded', function(e) {
                            grid.sorting.sort(sortColumns);
                        });
                    },

                    renderHeaderCell: function(column, columnIdx) {
                        var header = $super.renderHeaderCell(column, columnIdx);

                        if(column.sortable === undefined || column.sortable) {
                            header.append('<div class=\'pg-sorter\'>');
                            header.addClass('pg-sortable');
                            var key = typeof column.key === 'string' ? column.key : JSON.stringify(column.key);
                            console.log('column', column);
                            console.log('sortColumns', sortColumns);
                            console.log('sortColumns[0]', sortColumns[0]);
                            console.log('sortColumns[0].key', sortColumns[0].key);
                            console.log('column.key', column.key);
                            console.log('key', key);
                            console.log('sortColumns[0].key === key', sortColumns[0].key === key);
                            if(sortColumns[0] && sortColumns[0].key === key) {
                                header.addClass('pg-sort-' + sortColumns[0].direction);
                            }
                        }

                        return header;
                    },

                    sorting: {
                        sort: function (columnSettings) {
                            if(typeof grid.dataSource.sort !== 'function') {
                                console.warn && console.warn('Trying to sort unsortable datasource');
                            } else {
                                grid.dataSource.sort(this.compareRow.bind(this, columnSettings), columnSettings);
                            }
                        },

                        compareRow: function(columnSettings, a, b) {
                            for(var x=0,l=columnSettings.length;x<l;x++) {
                                var setting = columnSettings[x],
                                    column = grid.getColumnForKey(setting.key),
                                    result;

                                if(column === undefined) {
                                    continue;
                                }

                                if(typeof column.compare === 'function') {
                                    result = column.compare(utils.getValue(a, column.key), utils.getValue(b, column.key));
                                } else {
                                    result = this.compareValue(utils.getValue(a, column.key), utils.getValue(b, column.key));
                                }

                                if(result !== 0) {
                                    if(setting.direction === 'descending') {
                                        result = -1 * result;
                                    }
                                    return result;
                                }
                            }
                        },

                        compareValue: function(a,b) {
                            if((a === null || a === undefined) && (b === null || b === undefined)) return 0;
                            if(a === null || a === undefined) return -1;
                            if(b === null || b === undefined) return 1;

                            if(typeof a === 'string' && typeof b === 'string') return this.compareString(a,b);

                            if(a<b) return -1;
                            else if(a>b) return 1;
                            else return 0;
                        },

                        compareString: function(a,b) {
                            var split = /([0-9]+|.)/g,
                                isNumber = /^[0-9]+$/,
                                sA = a.toLocaleUpperCase().match(split),
                                sB = b.toLocaleUpperCase().match(split);
                            for(var x=0,l=Math.min(sA.length,sB.length);x<l;x++) {
                                var cA = sA[x], cB = sB[x];
                                if(cA.match(isNumber)) {
                                    if(!cB.match(isNumber)) {
                                        return -1;
                                    } else {
                                        var nA = parseInt(cA), nB = parseInt(cB);
                                        if(nA < nB) return -1;
                                        if(nA > nB) return 1;
                                    }
                                } else if(cB.match(isNumber)) {
                                    return 1;
                                }
                                if(sA[x] < sB[x]) return -1;
                                if(sA[x] > sB[x]) return 1;
                            }
                        }
                    }
                }
            });
        }
   };

});

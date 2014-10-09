define(['override', 'jquery', 'jsrender', 'promise', 'extensions/treegrid', 'text!../templates/grouper.html',
        'text!../templates/grouprow.html', 'text!../templates/groupindicator.html'],
       function(override, $, jsrender, Promise, treegrid, grouperTemplate, grouprow, groupindicator) {
    "use strict";
    
    function GroupingDataSource(delegate) {
        this.delegate = delegate;
        if(delegate.isReady()) {
            this.load();
        }
        
        $(delegate).on("dataloaded", this.load.bind(this));
        this.groups = [];
    }
    
    GroupingDataSource.prototype = {
        load: function() {
            this.updateView();
        },
        
        updateView: function() {
            var groupRows = this.groupRows = {};
            var rowToGroupMap = {};
            function group(nodes, groupings, parentGroupId, level) {
                if(groupings && groupings.length) {
                    var groupMap = {},
                        groups = [],
                        col = groupings[0],
                        f = col.groupProjection && col.groupProjection(nodes) || function(v) { return v; },
                        nextGroupings = groupings.slice(1);
                    for(var x=0,l=nodes.length;x<l;x++) {
                        var g = f(nodes[x][col.key]);
                        var r = groupMap[g];
                        if(!r) {
                            groups.push(groupMap[g] = r = {
                                groupRow: true,
                                id: parentGroupId + g + ":",
                                description: g,
                                children: [],
                                _groupColumn: col,
                                _groupLevel: level
                            });
                            
                            r[col.key] = g;
                        }
                        r.children.push(nodes[x]);
                        groupRows[r.id] = r;
                    }
                    
                    for(var x=0,l=groups.length;x<l;x++) {
                        groups[x].children = group(groups[x].children, nextGroupings, groups[x].id, level + 1);
                    }
                    
                    return groups;
                } else {
                    for(var x=0,l=nodes.length;x<l;x++) {
                        rowToGroupMap[nodes[x].id] = parentGroupId;
                    }
                    return nodes;
                }
            }
            
            this.view = group(this.delegate.getData(), this.groups, "group:", 0);
            $(this).trigger("dataloaded");
        },
        
        group: function(groupings) {
            this.groups = groupings;
            this.updateView();
        },
        
        getRecordById: function(id) {
            return this.groupRows[id] || this.delegate.getRecordById(id);
        },
        
        getData: function(start, end) {
            this.assertReady();
            if(start !== undefined || end !== undefined) {
                return this.view.slice(start, end);
            } else {
                return this.view;
            }
        },
        
        recordCount: function() {
            this.assertReady();
            return this.view.length;
        },
        
        isReady: function() {
            return this.view !== undefined;
        },
        
        assertReady: function() {
            if(!this.isReady()) {
                throw "Datasource not ready yet";
            }
        }
    };
    
    return {
        conflicts: ['treegrid'],
        requires: {
            dragging: {
                allowDragOutsideOfViewPort: true
            },
            treegrid: {
                autoTreeDataSource: false
            }
        },
        init: function(grid, pluginOptions) {
            
            var groupingds = new GroupingDataSource(grid.dataSource),
                treeds = new treegrid.TreeGridDataSource(groupingds),
                groupRowTemplate = $.templates(grouprow),
                groupIndicatorTemplate = $.templates(groupindicator);
            
            grid.dataSource = treeds;
            
            return override(grid,function($super) {
                return {
                    init: function() {
                        $super.init();
                        
                        var grouper = $(grouperTemplate);
                        
                        this.grouping.grouper = grouper;
                        
                        grouper.on("columndropped", function(event) {
                            grid.grouping.addGroupBy(event.column);
                        }).on("columndragenter", function(event) {
                            if(grid.grouping.groups.indexOf(event.column) > -1) {
                                event.preventDefault();
                            }
                        });
                        
                        this.target.on("click", ".pg-grouping-grouptoggle", function(event) {
                            var toggle = this,
                                groupId = $(toggle).attr("data-id");
                            
                            treeds.toggle(groupId);
                        }).on("click", ".pg-group-delete", function(event) {
                            grid.grouping.removeGroupBy(grid.getColumnForKey($(this).attr("data-group-key")));
                        });
                        
                        this.columnheadercontainer.addClass("pg-grouping-enabled").prepend(grouper);
                    },
                    
                    headerHeight: function() {
                        return $super.headerHeight() + this.target.find(".pg-grouper").outerHeight();
                    },
                    
                    renderRowToParts: function(record, rowIdx, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight) {
                        if(record.groupRow) {
                            var firstPart = rowFixedPartLeft || rowScrollingPart || rowFixedPartRight;
                            firstPart.addClass("pg-grouping-grouprow");
                            firstPart.html(groupRowTemplate.render(record, { column: record._groupColumn }));
                        } else {
                            $super.renderRowToParts(record, rowIdx, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight);
                        }
                    },
                    
                    grouping: {
                        groups: [],
                        
                        addGroupBy: function(column) {
                            this.groups.push(column);
                            this.grouper.append(this.renderGroupIndicator(column));
                            this.updateGroups();
                        },
                        
                        removeGroupBy: function(column) {
                            var indicator = this.grouper.find(".pg-group-indicator[data-group-key='" + column.key +"']");
                            indicator.remove();
                            this.groups.splice(this.groups.indexOf(column), 1);
                            this.updateGroups();
                        },
                        
                        updateGroups: function() {
                            groupingds.group(this.groups);
                            grid.trigger("groupingchanged", this.groups);
                            grid.target.attr("data-group-leaf-level", this.groups.length);
                            grid.renderData();
                        },
                        
                        updateGrouper: function() {
                            var grouper = this.grouper.empty();
                            this.target.attr("data-group-leaf-level", this.groups.length);
                            this.groups.forEach(function(e) {
                                grouper.append(grid.grouping.renderGroupIndicator(e));
                            });
                        },
                        
                        renderGroupIndicator: function(column) {
                            return groupIndicatorTemplate.render(column);
                        }
                    }
                };
            });
        }
   };
});
// ==UserScript==
// @id             iitc-plugin-portal-watch
// @name           IITC plugin: Portal Watch
// @category       Info
// @version        0.0.4.20151229233000
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://s3-eu-west-1.amazonaws.com/ingress-sandbox/portal-watch.meta.js
// @downloadURL    https://s3-eu-west-1.amazonaws.com/ingress-sandbox/portal-watch.user.js
// @description    Watches defined portals for resonator details.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @include        https://www.ingress.com/mission/*
// @include        http://www.ingress.com/mission/*
// @match          https://www.ingress.com/mission/*
// @match          http://www.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// use own namespace for plugin
window.plugin.portalWatch = function() {
};

window.plugin.portalWatch.portalsLoaded = [];    
window.plugin.portalWatch.isLoadPortalDetails = false;
window.plugin.portalWatch.exportPortalsByAgentsList = [];
    
window.plugin.portalWatch.loadPortalDetails = function() {    
    var portals = window.plugin.portalWatch.getPortalsFromStorage();
    
	if(!portals || portals.length < 1) {
		alert("No portals are defined!");
		return;
	}
    //make an internal list
    window.plugin.portalWatch.portalsLoaded = []; 
    $.each(portals, function(i, guid) {
        if(!window.portals[guid]) {
            console.log("Portal with ID " + guid + " was not found on the map!");
            return;
        }
		if (guid && !portalDetail.isFresh(guid)) {
            window.plugin.portalWatch.portalsLoaded[guid] = false;
        } else {
            window.plugin.portalWatch.portalsLoaded[guid] = true;
        }
    });
    
    if(window.plugin.portalWatch.isAllPortalsAreLoaded()) {
        window.plugin.portalWatch.showWatcher();
        return;
    }

    window.plugin.portalWatch.isLoadPortalDetails = true;
    
    //load details
    $.each(portals, function(i, guid) {
        if(!window.portals[guid]) {
            console.log("Portal with ID " + guid + " was not found on the map!");
            return;
        }
		if (guid && !portalDetail.isFresh(guid)) {
			portalDetail.request(guid);
        }
    });
}
        
window.plugin.portalWatch.showWatcher = function() {
    window.plugin.portalWatch.isLoadPortalDetails = false;
    window.plugin.portalWatch.exportPortalsByAgentsList = [];
    
    var resoDetails = [];
	var processResonatorSlot = function(reso,slot) {
		var lvl=0, nrg=0, owner=null;

		if (reso) {
		  lvl = parseInt(reso.level);
		  nrg = parseInt(reso.energy);
		  owner = reso.owner;
		}

		resoDetails.push(renderResonatorDetails(slot, lvl, nrg, owner));
	};    

    var portals = window.plugin.portalWatch.getPortalsFromStorage();
	if(!portals || portals.length < 1) {
		alert("No portals are defined!");
		return;
	}

	var html = "<table>";
	$.each(portals, function(i, guid) {
		if (guid && !portalDetail.isFresh(guid)) {
            console.log("Portal with ID " + guid + " details are not availabe!");
			return;
		}

        var portal = window.portals[guid];
        if (!portal) {
            console.log("Portal with ID " + guid + " was not found on the map!");
            return;
        }
       
        var data = portal.options.data;
		var details = window.portalDetail.get(guid);
        
        //console.log("showWatcher portal", portal);
        //console.log("showWatcher data", data);
        //console.log("showWatcher details", details);

		// details and data can get out of sync. if we have details, construct a matching 'data'
		if (details) {
			data = getPortalSummaryData(details);
		}
        
        resoDetails = [];
        var resoAgents = [];
        var missingR8 = 8;
        
        if (details.resonators && details.resonators.length == 8) {
				// fully deployed - we can make assumptions about deployment slots
			$.each([2, 1, 3, 0, 4, 7, 5, 6], function(ind, slot) {
                var r = details.resonators[slot];
                if(r.level === 8) {
                    resoAgents.push(r.owner.toLowerCase());
                    missingR8--;
                }
				processResonatorSlot(r,slot);
			});
		} else {
			// partially deployed portal - we can no longer find out which resonator is in which slot
			for(var ind=0; ind<8; ind++) {
                var r = ind < details.resonators.length ? details.resonators[ind] : null;
                if(r && r.level === 8) {
                    resoAgents.push(r.owner.toLowerCase());
                    missingR8--;
                }
				processResonatorSlot(r, null);
			}
		}
        
        html += "<tr>";
        html += "<td style='width:130px' " + (data.team === "R" ? "class='res'" : (data.team === "E" ? "class='enl'" : "")) +  ">" + data.title + "</td>";
        html += "<td style='width:30px'><span style='white-space: nowrap;background:" + COLORS_LVL[data.level] + ";height:20px;padding:0 5px 0 5px;'>P " + data.level + "</span></td>";
		$.each(resoDetails, function(i, r) {
			html += "<td style='width:50px'>" + r[0] + "</td>";
		});
                
        var agents = window.plugin.portalWatch.getAgentsFromStorage();
        html += "<td style='width:200px'>";
        if(agents && data.level < 8) {
            $.each(agents, function(i, a) { 
                if(resoAgents.indexOf(a.toLowerCase()) < 0) {
                    html += "<span>" + a + "</span> ";
                    
                    if(!window.plugin.portalWatch.exportPortalsByAgentsList[a])
                        window.plugin.portalWatch.exportPortalsByAgentsList[a] = [];
                    window.plugin.portalWatch.exportPortalsByAgentsList[a].push({ title : data.title, missingR8 : missingR8, team: data.team, level: data.level });
                }
            });
        }
        html += "</td>";
        html += "<td style='width:10px'><a href='javascript:window.plugin.portalWatch.removePortalFromWatcher(\""+guid+"\")' title='Remove portal'>X</a></td>";
		
		html += "</tr>";
	});

    html += "</table><button onclick='window.plugin.portalWatch.exportPortalsByAgents();'>Export By Agents</button>"

	//var modDetails = details ? '<div class="mods">'+getModDetails(details)+'</div>' : '';
	//var miscDetails = details ? getPortalMiscDetails(guid,details) : '';
	//var resoDetails = details ? getResonatorDetails(details) : '';
    
	//console.log("modDetails", modDetails);
    //console.log("miscDetails", miscDetails);
    //console.log("resoDetails", resoDetails);
    
    var d = dialog({
            html: html,
            dialogClass: "ui-dialog-linklist",
            title: "Portal Watcher",
            id: "portal-watch-watcher",
            width: 800,
            buttons: [{
                text: "Close",
                click: function() {
                    $(this).dialog("close");
                }
            }]
        });
}

window.plugin.portalWatch.getPortalsFromStorage = function() {
	var portals = [];
	var storedPortals = localStorage["portal-watch-storage"];
	if(storedPortals) {
		try {
			portals = JSON.parse(storedPortals);
		} catch(e) {
			console.log(e);
			alert("Portals are not readable!");
			return null;
		}	
	}
    
    return portals;
}

window.plugin.portalWatch.savePortalsToStorage = function(portals) {
    localStorage["portal-watch-storage"] = JSON.stringify(portals);
}

window.plugin.portalWatch.removePortalFromWatcher = function(guid) {
    var portals = window.plugin.portalWatch.getPortalsFromStorage();
    if(!portals)
        return;
    
    var index = portals.indexOf(guid);
    if (index > -1) {
        portals.splice(index, 1);
    }                           
    
    window.plugin.portalWatch.savePortalsToStorage(portals);
    
    $("#portal-watch-watcher").dialog("close");
    
    setTimeout(function() { 
        window.plugin.portalWatch.showWatcher();
    }, 2);
}

window.plugin.portalWatch.addPortalToWatcher = function() {
	var guid = window.selectedPortal,
		portal = window.portals[guid];
	if (guid === null || !portal) {
		alert("Please select a portal first!");
		return;
	}

    var portals = window.plugin.portalWatch.getPortalsFromStorage();
	if(!portals)
        return;
	
	portals.push(guid);
	console.log("Portal with ID " +  guid + " has been added to the watcher");
    
    window.plugin.portalWatch.savePortalsToStorage(portals);
}

window.plugin.portalWatch.getAgentsFromStorage = function() {
    var agents = [];
	var storedAgents = localStorage["portal-watch-storage-agents"];
	if(storedAgents) {
		try {
			agents = JSON.parse(storedAgents);
		} catch(e) {
			console.log(e);
			alert("Agents are not readable!");
			return null;
		}	
	}

    return agents;
}

window.plugin.portalWatch.saveAgentsToStorage = function(agents) {
    localStorage["portal-watch-storage-agents"] = JSON.stringify(agents);
}

window.plugin.portalWatch.refreshAgentsTable = function() {
    var agents = window.plugin.portalWatch.getAgentsFromStorage();
	if(!agents)
        return;

    var table = $("#portal_watch_nickname_table");
    if(table) {
        table.empty();
        $.each(agents, function(i, a) {
            table.append("<tr><td style='width:150px'>"+a+"</td><td><a href='javascript:window.plugin.portalWatch.removeAgent(\""+a+"\")' title='Remove agent'>X</a></td></tr>");
        });
    }
}

window.plugin.portalWatch.removeAgent = function(nickname) {
    if(!nickname)
        return;
    var agents = window.plugin.portalWatch.getAgentsFromStorage();
	if(!agents)
        return;
    
    var index = agents.indexOf(nickname);
    if (index > -1) {
        agents.splice(index, 1);
    }                           
    window.plugin.portalWatch.saveAgentsToStorage(agents);
    window.plugin.portalWatch.refreshAgentsTable();
}

window.plugin.portalWatch.addAgent = function() {
    var agents = window.plugin.portalWatch.getAgentsFromStorage();
	if(!agents)
        return;

    var input = $("#portal_watch_nickname");
    if(input && input.val()) {
        agents.push(input.val());
        console.log("Agent " + input.val() + " has been added to the watcher");
    }
    
    window.plugin.portalWatch.saveAgentsToStorage(agents);
    
    window.plugin.portalWatch.refreshAgentsTable();
}

window.plugin.portalWatch.showAddAgents = function() {
    var html = "<input id='portal_watch_nickname' style='width:150px'/> <button onclick='window.plugin.portalWatch.addAgent();'>Add</button>";
    html += "<table id='portal_watch_nickname_table'></table>";
    
    var d = dialog({
        html: html,
        dialogClass: "ui-dialog-linklist",
        title: "Portal Watcher - Agents",
        id: "portal-watch-agents",
        width: 300,
        buttons: [{
            text: "Close",
            click: function() {
                $(this).dialog("close");
            }
        }],
        focusCallback : function() {
            window.plugin.portalWatch.refreshAgentsTable();
        }
    });
}

window.plugin.portalWatch.isAllPortalsAreLoaded = function() {
    return Object.keys(window.plugin.portalWatch.portalsLoaded).every(function(k) { 
        return window.plugin.portalWatch.portalsLoaded[k] === true; 
    });
}

window.plugin.portalWatch.exportPortalsByAgents = function() {
    var html = "<textarea id='portal_watch_portalsbyagents' rows='10' cols='35'>";
     
    $.each(Object.keys(window.plugin.portalWatch.exportPortalsByAgentsList), function(i, a) { 
        var agentObj = window.plugin.portalWatch.exportPortalsByAgentsList[a];
        if(agentObj) {
            html += "@" + a + "\n";
            $.each(agentObj.sort(
                function (a, b) {
                    if (a.team === "E" && b.team === "R") // Alphabet order :)
                      return -1;
                    if (a.team === "R" && b.team === "E")
                      return 1;
                    return 0;
                    }), 
                function(j, p) {
                    html += "* " + p.team + "P" + p.level + " " + p.title + " (missing " + p.missingR8 + " R8)\n";
            });
        }
    });
    html += "</textarea>";
        
    var d = dialog({
        html: html,
        dialogClass: "ui-dialog-linklist",
        title: "Portal Watcher - Export",
        id: "portal-watch-portals-by-agents",
        width: 300,
        buttons: [{
            text: "Close",
            click: function() {
                $(this).dialog("close");
            }
        }]
    });
}

window.plugin.portalWatch.init = function() {

$("#toolbox").after('<div id="portal-watch-toolbox"></div>');
$("#portal-watch-toolbox")
	.append('<a onclick="window.plugin.portalWatch.addPortalToWatcher()" title="Add portal to Watcher">Add Portal</a>&nbsp;&nbsp;&nbsp;')
    .append('<a onclick="window.plugin.portalWatch.showAddAgents()" title="Add agents to Watcher">Agents</a>&nbsp;&nbsp;&nbsp;')
	.append('<a onclick="window.plugin.portalWatch.loadPortalDetails()" title="Show Watcher" id="portal-watch-show-watcher">Show Watcher</a>');

}

var setup = function() {

    window.plugin.portalWatch.init();
    window.addHook('portalDetailLoaded', function(data) { 
        //console.log(window.plugin.portalWatch.portalsLoaded);
        if(window.plugin.portalWatch.isLoadPortalDetails &&
           data && data.success) {
            window.plugin.portalWatch.portalsLoaded[data.guid] = true;
            setTimeout(function(){
                if(window.plugin.portalWatch.isAllPortalsAreLoaded())
                    window.plugin.portalWatch.showWatcher();
            },1); 
        }
    });
}

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);



var socket = io('/control');

var canvassize = {x: 0, y: 0};

var drawings = Array();

var panel_mapping, panel_drawing;

socket.on("update-clients", function (data) {
    
    //remove event handlers
    $(".startmapping").off();
    $("#tcp-clients").empty();
    //populate list
    $.each(data.tcpclients, function(a, obj) {
        $('#tcp-clients').append("<li clientid='" + obj.id + "'><span>" + obj.id + "</span> <span class='startmapping'>mapping</span></li>");
    });
    //update list item count
    $(".projections-num").html("("+data.tcpclients.length+")");
    //attach event handler to mapping link
    $(".startmapping").on("click", function() {
        var id = $(this).parent("li").attr("clientid");
        socket.emit("joinMapping", {client: id});
        showMapping();
    })
    
    $("#web-clients").empty();
    $.each(data.httpclients, function(a, obj) {
        $('#web-clients').append("<li class='webclient-"+identify(obj.id)+"'><span>" + obj.id + "</span></li>");
        var client = $(".webclient-"+identify(obj.id));
        client.css({color: obj.color});
    });
    $(".participants-num").html("("+data.httpclients.length+")");

});

socket.on("colorChanged", function (data) {

    $(".webclient-"+identify(data.id)).css({color: data.color});
    setDrawingColor(data.id, data.color);

});

socket.on("client-active", function (data) {

    var client = $(".webclient-"+identify(data.id));

    client.fadeOut(300, function() {
        $(this).fadeIn(300);
    });
    
});

socket.on("updateMappingForm", function (data) {
});

socket.on("newMappingForm", function (data) {
 
    polygon = panel_mapping.createPolygon();

    for(var i = 0; i < Object.size(data.points); i++) {
        var x = parseFloat(data.points[i].x);
        var y = parseFloat(data.points[i].y);
        polygon.addPointXY(x,y);
    }

    if(data.type === "painting")
        polygon.getFill().setColor("rgb(0, 100, 200)");
    if(data.type === "picture")
        polygon.getFill().setColor("rgb(255, 100, 100)");
    if(data.type === "window")
        polygon.getFill().setColor("rgb(0, 0, 0)");

    //polygon.getStroke().setWeight(5);
      //polygon.getStroke().setColor("rgb(0,0,255)");
      polygon.getFill().setOpacity(0.5);
      panel_mapping.addElement(polygon);

});

socket.on("movedDrawer", function (data) {

    var drawing = getDrawing(data.id);
    drawing.getStroke().setColor(data.color);
    drawing.addPointXY(parseFloat(data.pos[0]), parseFloat(data.pos[1]));

});

socket.on("mappingSize", function (data) {

    canvassize = data;
    var mapping = document.getElementById("panel_mapping");
    $(mapping).css({"height": canvassize.height, "width": canvassize.width});

    var drawing = document.getElementById("panel_drawing");
    $(drawing).css({"height": canvassize.height, "width": canvassize.width});

    var stream = document.getElementById("stream");
    $(stream).attr("height", canvassize.height);
    $(stream).attr("width", canvassize.width);
    var stream_embed = document.getElementById("stream_embed");
    $(stream_embed).attr("height", canvassize.height);
    $(stream_embed).attr("width", canvassize.width);
    
});

socket.on('ready', function (data) {

    /****************** GET DEVICE TYPE *******************/

    var type = "PC or other";
    if ((navigator.userAgent.match(/iPhone/) || navigator.userAgent.match(/iPod/)) || navigator.userAgent.match(/Android/)) {
        mobile = true;
        if(navigator.userAgent.match(/iPhone/))
            type="iphone";
        if(navigator.userAgent.match(/iPod/))
            type="ipod";
        if(navigator.userAgent.match(/Android/))
            type="android";
    }

});

function getDrawing(id) {
    if(typeof drawings[id] === 'undefined') {
        var line = panel_drawing.createPolyline();
        drawings[id] = line;
        drawings[id].getStroke().setWeight(1);
        panel_drawing.addElement(drawings[id]);
    }
    return drawings[id];
}

function setDrawingColor(id, color) {
    var drawing = getDrawing(id);
    drawing.getStroke().setColor(data.color);
}

var mobile = false;

window.onload = function() {

    panel_mapping = new jsgl.Panel(document.getElementById("panel_mapping"));
    panel_drawing = new jsgl.Panel(document.getElementById("panel_drawing"));
}

/**
     * Helper method for cross-browser registering of event listeners.
     * @param {Element} element
     * @param {String} eventName
     * @param {Function} handler
     * @param {Boolean} captureEvents
     */
function _addEventListener(element, eventName, handler, captureEvents){
    if (document.addEventListener) {
        // W3C
        element.addEventListener(eventName, handler, captureEvents);
    }
    else
        if (document.attachEvent) {
            // IE
            element.attachEvent('on' + eventName, handler);
        }
        else {
            element['on' + eventName] = handler;
        }
}

function identify(ugly) {
    if(ugly) {
        ugly = ugly.split(".").join("")
        return ugly;
    }
}

function showMapping() {
    //blend out control overview and blend in mapping
    $("#mapping").show();
    $("#main").hide();
    
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};